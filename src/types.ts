export interface SpreadsheetData {
  headers: string[];
  data: Record<string, any>[];
  rowCount: number;
}

export interface SpreadsheetReadParams {
  spreadsheetId: string;
  range: string;
}

export interface FormulaRequest {
  spreadsheetId: string;
  range: string;
  formula: string;
}

export interface FormulaSuggestionRequest {
  spreadsheetId: string;
  range: string;
  description: string;
}

export interface FormulaResult {
  message: string;
  originalFormula: string;
  results: any[][];
}

export interface FormulaSuggestion {
  suggestedFormula: string;
}
