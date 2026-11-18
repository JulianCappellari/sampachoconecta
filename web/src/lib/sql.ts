/** Traducción léxica: nunca reemplaza signos o palabras dentro de literales/comentarios. */
export function translate(input: string): string {
  let sql = input.trim().replace(/;\s*$/, "");
  const ignore = /^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(sql);
  if (ignore) sql = sql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, "INSERT INTO");
  let index = 0;
  sql = sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\$([a-zA-Z_]\w*|)\$[\s\S]*?\$\1\$|--[^\n]*|\/\*[\s\S]*?\*\/|\?[0-9]*|\bLIKE\b/gi, (token) => {
    if (token.startsWith("?")) {
      index = token.length > 1 ? Number(token.slice(1)) : index + 1;
      return `$${index}`;
    }
    if (/^LIKE$/i.test(token)) return "ILIKE";
    return token;
  });
  if (ignore) {
    if (/\bON\s+CONFLICT\b/i.test(sql)) throw new Error("INSERT OR IGNORE no puede combinarse con ON CONFLICT");
    sql += " ON CONFLICT DO NOTHING";
  }
  return sql;
}

export const COMPATIBILITY_SQL = String.raw`
CREATE EXTENSION IF NOT EXISTS citext;
CREATE OR REPLACE FUNCTION datetime(input text, VARIADIC modifiers text[] DEFAULT ARRAY[]::text[])
RETURNS text LANGUAGE plpgsql STABLE SET timezone='UTC' AS $$
DECLARE stamp timestamptz; modifier text;
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;
  stamp := CASE WHEN input = 'now' THEN statement_timestamp() ELSE input::timestamptz END;
  FOREACH modifier IN ARRAY modifiers LOOP
    IF modifier IS NULL THEN RETURN NULL; END IF;
    IF modifier !~ '^[+-]?[0-9]+(\.[0-9]+)? (seconds?|minutes?|hours?|days?|months?|years?)$' THEN
      RAISE EXCEPTION 'Modificador datetime no soportado: %', modifier;
    END IF;
    stamp := stamp + modifier::interval;
  END LOOP;
  RETURN to_char(stamp AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS');
END; $$;
CREATE OR REPLACE FUNCTION julianday(input text) RETURNS double precision LANGUAGE sql STABLE SET timezone='UTC' AS $$
  SELECT CASE WHEN input IS NULL THEN NULL ELSE
    EXTRACT(EPOCH FROM CASE WHEN input = 'now' THEN statement_timestamp() ELSE input::timestamptz END)::double precision / 86400.0 + 2440587.5 END;
$$;
`;
