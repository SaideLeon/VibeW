import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImportedXmlComponent, ExternalHyperlink, IParagraphOptions, AlignmentType, convertMillimetersToTwip } from 'docx';
import { DocumentNode, InlineNode } from './types';
import { convertLatexToOmml } from './math-converter';

interface TextOptions {
  bold?: boolean;
  italics?: boolean;
}

async function buildInline(node: InlineNode, options: TextOptions = {}): Promise<any> {
  switch (node.type) {
    case 'text':
      return new TextRun({ text: node.value, bold: options.bold, italics: options.italics });
    case 'math_inline': {
      const omml = await convertLatexToOmml(node.latex, false);
      const comp = ImportedXmlComponent.fromXmlString(omml);
      return (comp as any).root[0];
    }
    case 'strong': {
      const children = await Promise.all(node.children.map(c => buildInline(c, { ...options, bold: true })));
      return children.flat();
    }
    case 'emphasis': {
      const children = await Promise.all(node.children.map(c => buildInline(c, { ...options, italics: true })));
      return children.flat();
    }
    case 'inline_code':
      return new TextRun({ text: node.value, font: 'Courier New', bold: options.bold, italics: options.italics });
    case 'link': {
      const children = await Promise.all(node.children.map(c => buildInline(c, options)));
      return new ExternalHyperlink({
        children: children.flat(),
        link: node.url
      });
    }
  }
}

async function buildBlock(node: DocumentNode, options: IParagraphOptions = {}): Promise<any> {
  switch (node.type) {
    case 'paragraph': {
      const children = await Promise.all(node.children.map(c => buildInline(c)));
      return new Paragraph({ ...options, children: children.flat() });
    }
    case 'math_block': {
      const omml = await convertLatexToOmml(node.latex, true);
      const comp = ImportedXmlComponent.fromXmlString(omml);
      return new Paragraph({ ...options, children: [(comp as any).root[0]] });
    }
    case 'heading': {
      const children = await Promise.all(node.children.map(c => buildInline(c)));
      const headingMap: Record<number, any> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6,
      };
      return new Paragraph({
        ...options,
        children: children.flat(),
        heading: headingMap[node.level]
      });
    }
    case 'list': {
      const items = await Promise.all(node.items.map(async (itemBlocks) => {
        const blocks = await Promise.all(itemBlocks.map((block, i) => {
          if (i === 0) {
            return buildBlock(block, {
              ...options,
              bullet: node.ordered ? undefined : { level: 0 },
              numbering: node.ordered ? { reference: 'ordered-list', level: 0 } : undefined
            });
          }
          return buildBlock(block, options);
        }));
        return blocks;
      }));
      return items.flat();
    }
    case 'blockquote': {
      const children = await Promise.all(node.children.map(c => buildBlock(c, { ...options, style: "Quote" })));
      return children.flat();
    }
  }
}

export async function buildDocxDocument(ast: DocumentNode[]): Promise<Document> {
  const blocks = await Promise.all(ast.map(c => buildBlock(c)));
  
  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24, // 12pt (24 half-points)
          },
          paragraph: {
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
              line: 360, // 1.5 line spacing (240 * 1.5)
              lineRule: "auto",
            },
          },
        },
      },
      paragraphStyles: [
        {
          id: "Quote",
          name: "Quote",
          basedOn: "Normal",
          next: "Normal",
          run: {
            size: 20, // 10pt (20 half-points)
          },
          paragraph: {
            spacing: {
              line: 240, // Single spacing
              lineRule: "auto",
            },
            indent: {
              left: convertMillimetersToTwip(40), // 4cm indent for long quotes
            },
          },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "ordered-list",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: "start",
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: {
            width: convertMillimetersToTwip(210), // A4 width
            height: convertMillimetersToTwip(297), // A4 height
          },
          margin: {
            top: convertMillimetersToTwip(30), // 3.0 cm
            left: convertMillimetersToTwip(30), // 3.0 cm
            bottom: convertMillimetersToTwip(20), // 2.0 cm
            right: convertMillimetersToTwip(20), // 2.0 cm
          },
        },
      },
      children: blocks.flat()
    }]
  });
}
