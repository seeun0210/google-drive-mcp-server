import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export interface SpreadsheetFormulaRequest {
  spreadsheetId: string;
  range: string;
  formula: string;
}

export async function readSpreadsheet(
  auth: OAuth2Client,
  spreadsheetId: string,
  range: string
): Promise<any> {
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { message: "No data found." };
    }

    // Convert the data to a more structured format
    const headers = rows[0];
    const data = rows.slice(1).map((row) => {
      const item: { [key: string]: any } = {};
      row.forEach((value, index) => {
        item[headers[index]] = value;
      });
      return item;
    });

    return {
      headers,
      data,
      rowCount: rows.length - 1, // Excluding header row
    };
  } catch (error) {
    console.error("The API returned an error:", error);
    throw error;
  }
}

export async function applyFormula(
  auth: OAuth2Client,
  request: SpreadsheetFormulaRequest
): Promise<any> {
  const sheets = google.sheets({ version: "v4", auth });

  try {
    // First, get the current sheet data to determine the range
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: request.spreadsheetId,
      range: request.range,
    });

    const rows = response.data.values || [];
    const formulaRows = rows.map((row) => row.map(() => request.formula));

    // Apply the formula to the specified range
    await sheets.spreadsheets.values.update({
      spreadsheetId: request.spreadsheetId,
      range: request.range,
      valueInputOption: "USER_ENTERED", // This allows formulas to be evaluated
      requestBody: {
        values: formulaRows,
      },
    });

    // Read the results after applying the formula
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: request.spreadsheetId,
      range: request.range,
    });

    return {
      message: "Formula applied successfully",
      originalFormula: request.formula,
      results: result.data.values,
    };
  } catch (error) {
    console.error("Error applying formula:", error);
    throw error;
  }
}

export async function suggestFormula(
  auth: OAuth2Client,
  spreadsheetId: string,
  range: string,
  description: string
): Promise<string> {
  // 먼저 스프레드시트의 데이터를 읽어와서 컨텍스트로 활용
  const sheets = google.sheets({ version: "v4", auth });
  let contextData = "";

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    if (response.data.values) {
      contextData = `Selected range (${range}) contains ${response.data.values.length} rows and ${response.data.values[0].length} columns.\n`;
      contextData += `Sample data: ${JSON.stringify(
        response.data.values.slice(0, 3)
      )}\n`;
    }
  } catch (error) {
    console.warn("Could not fetch context data:", error);
  }

  // LLM에게 전달할 프롬프트 구성
  const prompt = `As a Google Sheets formula expert, suggest a formula for the following request:

Context:
${contextData}

User request: ${description}

Available formula categories:
1. Math: SUM, AVERAGE, COUNT, MAX, MIN, PRODUCT, POWER, ROUND, SUMIF, COUNTIF
2. Text: CONCATENATE, LEFT, RIGHT, MID, LEN, LOWER, UPPER, PROPER, TRIM, SUBSTITUTE
3. Date: TODAY, NOW, YEAR, MONTH, DAY, WEEKDAY, NETWORKDAYS, DATEDIF
4. Lookup: VLOOKUP, HLOOKUP, INDEX, MATCH, INDIRECT, ADDRESS
5. Conditional: IF, IFERROR, IFNA, AND, OR, NOT
6. Statistical: STDEV, VAR, MEDIAN, MODE, PERCENTILE, QUARTILE

Please suggest a Google Sheets formula that best matches the user's request. Include only the formula with proper syntax and parameters.`;

  try {
    // Claude API 호출 (실제 구현에서는 적절한 API 클라이언트 사용)
    // 여기서는 예시로 기존 로직을 유지하되, 향후 Claude API 통합을 위한 주석 추가
    const description_lower = description.toLowerCase();

    // 수학 연산
    const mathOperations = {
      sum: "=SUM(range)",
      average: "=AVERAGE(range)",
      count: "=COUNT(range)",
      max: "=MAX(range)",
      min: "=MIN(range)",
      product: "=PRODUCT(range)",
      power: "=POWER(number, power)",
      round: "=ROUND(number, decimals)",
      roundup: "=ROUNDUP(number, decimals)",
      rounddown: "=ROUNDDOWN(number, decimals)",
      sumif: "=SUMIF(range, criteria, [sum_range])",
      countif: "=COUNTIF(range, criteria)",
    };

    // 텍스트 연산
    const textOperations = {
      concatenate: "=CONCATENATE(text1, [text2, ...])",
      left: "=LEFT(text, [num_chars])",
      right: "=RIGHT(text, [num_chars])",
      mid: "=MID(text, start_num, num_chars)",
      len: "=LEN(text)",
      lower: "=LOWER(text)",
      upper: "=UPPER(text)",
      proper: "=PROPER(text)",
      trim: "=TRIM(text)",
      substitute: "=SUBSTITUTE(text, old_text, new_text, [instance_num])",
    };

    // 날짜 및 시간 연산
    const dateOperations = {
      date: "=DATE(year, month, day)",
      today: "=TODAY()",
      now: "=NOW()",
      year: "=YEAR(date)",
      month: "=MONTH(date)",
      day: "=DAY(date)",
      weekday: "=WEEKDAY(date, [type])",
      networkdays: "=NETWORKDAYS(start_date, end_date, [holidays])",
      datedif: "=DATEDIF(start_date, end_date, unit)",
    };

    // 검색 및 참조 연산
    const lookupOperations = {
      vlookup:
        "=VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])",
      hlookup:
        "=HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])",
      index: "=INDEX(array, row_num, [column_num])",
      match: "=MATCH(lookup_value, lookup_array, [match_type])",
      indirect: "=INDIRECT(ref_text, [a1])",
      address: "=ADDRESS(row_num, column_num, [abs_num], [a1], [sheet_text])",
    };

    // 조건부 연산
    const conditionalOperations = {
      if: "=IF(logical_test, value_if_true, value_if_false)",
      iferror: "=IFERROR(value, value_if_error)",
      ifna: "=IFNA(value, value_if_na)",
      and: "=AND(logical1, [logical2, ...])",
      or: "=OR(logical1, [logical2, ...])",
      not: "=NOT(logical)",
    };

    // 통계 연산
    const statisticalOperations = {
      stdev: "=STDEV(number1, [number2, ...])",
      var: "=VAR(number1, [number2, ...])",
      median: "=MEDIAN(number1, [number2, ...])",
      mode: "=MODE(number1, [number2, ...])",
      large: "=LARGE(array, k)",
      small: "=SMALL(array, k)",
      percentile: "=PERCENTILE(array, k)",
      quartile: "=QUARTILE(array, quart)",
    };

    // 키워드 매칭을 통한 수식 추천
    if (description_lower.includes("sum") && description_lower.includes("if")) {
      return mathOperations.sumif;
    } else if (
      description_lower.includes("count") &&
      description_lower.includes("if")
    ) {
      return mathOperations.countif;
    } else if (
      description_lower.includes("lookup") ||
      description_lower.includes("search")
    ) {
      if (
        description_lower.includes("vertical") ||
        description_lower.includes("column")
      ) {
        return lookupOperations.vlookup;
      } else if (
        description_lower.includes("horizontal") ||
        description_lower.includes("row")
      ) {
        return lookupOperations.hlookup;
      }
    } else if (description_lower.includes("date")) {
      if (description_lower.includes("today")) {
        return dateOperations.today;
      } else if (description_lower.includes("now")) {
        return dateOperations.now;
      } else if (
        description_lower.includes("difference") ||
        description_lower.includes("between")
      ) {
        return dateOperations.datedif;
      }
    } else if (
      description_lower.includes("text") ||
      description_lower.includes("string")
    ) {
      if (
        description_lower.includes("combine") ||
        description_lower.includes("join")
      ) {
        return textOperations.concatenate;
      } else if (description_lower.includes("length")) {
        return textOperations.len;
      } else if (description_lower.includes("uppercase")) {
        return textOperations.upper;
      } else if (description_lower.includes("lowercase")) {
        return textOperations.lower;
      }
    } else if (
      description_lower.includes("condition") ||
      description_lower.includes("if")
    ) {
      if (description_lower.includes("error")) {
        return conditionalOperations.iferror;
      } else if (description_lower.includes("and")) {
        return conditionalOperations.and;
      } else if (description_lower.includes("or")) {
        return conditionalOperations.or;
      } else {
        return conditionalOperations.if;
      }
    } else if (
      description_lower.includes("statistics") ||
      description_lower.includes("stat")
    ) {
      if (description_lower.includes("deviation")) {
        return statisticalOperations.stdev;
      } else if (description_lower.includes("variance")) {
        return statisticalOperations.var;
      } else if (description_lower.includes("median")) {
        return statisticalOperations.median;
      } else if (description_lower.includes("mode")) {
        return statisticalOperations.mode;
      }
    }

    // 기본 수학 연산 매칭
    for (const [key, formula] of Object.entries(mathOperations)) {
      if (description_lower.includes(key)) {
        return formula;
      }
    }

    // 기본값으로 SUM 반환
    return mathOperations.sum;
  } catch (error) {
    console.error("Error generating formula suggestion:", error);
    return "=SUM(range)"; // 기본값 반환
  }
}

export async function createSpreadsheet(
  auth: OAuth2Client,
  title: string
): Promise<any> {
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: title,
        },
      },
    });

    return {
      message: "Spreadsheet created successfully",
      spreadsheetId: response.data.spreadsheetId,
      spreadsheetUrl: response.data.spreadsheetUrl,
      title: response.data.properties?.title,
    };
  } catch (error) {
    console.error("Error creating spreadsheet:", error);
    throw error;
  }
}
