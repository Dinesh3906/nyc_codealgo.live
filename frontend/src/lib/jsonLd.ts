const ESCAPE_LOOKUP: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

export function jsonLdScriptProps(value: unknown) {
  return {
    __html: JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (char) => ESCAPE_LOOKUP[char]),
  };
}
