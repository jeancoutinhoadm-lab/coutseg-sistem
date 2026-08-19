import { format, parseISO, addMinutes } from "date-fns";
import { toZonedTime } from "date-fns-tz";

/**
 * Datas de negócio na CoutSeg são tratadas como "Floating Dates" (sem timezone).
 * O banco armazena como DATE (YYYY-MM-DD).
 * Esta utilidade garante que a conversão entre String -> Date -> Display 
 * não sofra desvios de +/- 1 dia devido ao timezone local do navegador.
 */

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Converte uma string YYYY-MM-DD em um objeto Date "seguro".
 * Evita o problema de strings ISO sem tempo serem interpretadas como meia-noite UTC
 * e retrocederem um dia em timezones ocidentais.
 */
export const parseSafeDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  
  // Se já for YYYY-MM-DD, adicionamos o meio do dia para garantir estabilidade
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return parseISO(`${dateStr}T12:00:00`);
  }
  
  try {
    return parseISO(dateStr);
  } catch (e) {
    return null;
  }
};

/**
 * Formata uma data para exibição respeitando a data nominal (YYYY-MM-DD).
 */
export const formatDisplayDate = (date: Date | string | null | undefined, pattern: string = "dd/MM/yyyy"): string => {
  if (!date) return "-";
  
  const dateObj = typeof date === "string" ? parseSafeDate(date) : date;
  if (!dateObj || isNaN(dateObj.getTime())) return "-";

  return format(dateObj, pattern);
};

/**
 * Retorna a data atual no formato YYYY-MM-DD no timezone de São Paulo.
 */
export const getTodayDateString = (): string => {
  const now = new Date();
  const zonedDate = toZonedTime(now, DEFAULT_TIMEZONE);
  return format(zonedDate, "yyyy-MM-dd");
};

/**
 * Retorna uma data ISO para Timestamps (auditoria, logs)
 */
export const getAuditTimestamp = (): string => {
  return new Date().toISOString();
};
