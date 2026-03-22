import temml from 'temml';
import { mml2omml } from 'mathml2omml';

export async function convertLatexToOmml(latex: string, display: boolean): Promise<string> {
  try {
    // Convert LaTeX to MathML using temml
    const mathml = temml.renderToString(latex, { displayMode: display });
    
    // Clean up MathML string if necessary (temml sometimes adds classes that mathml2omml might not need, but mathml2omml usually handles it)
    
    // Convert MathML to OMML
    const omml = mml2omml(mathml);
    return omml;
  } catch (error) {
    console.error('Error converting LaTeX to OMML:', error);
    // Fallback to text if conversion fails
    return `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:r><m:t>${latex}</m:t></m:r></m:oMath>`;
  }
}
