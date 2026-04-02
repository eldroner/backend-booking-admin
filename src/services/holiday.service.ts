import axios from 'axios';

export interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

class HolidayService {
  private cache: Map<string, { data: Holiday[]; expires: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

  async getHolidays(year: number): Promise<Holiday[]> {
    if (!Number.isFinite(year) || year < 1990 || year > 2100) {
      console.warn(`[holidays] Año inválido para API Nager: ${year}`);
      return [];
    }

    const cacheKey = `ES-${year}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    try {
      const response = await axios.get<Holiday[]>(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/ES`,
        {
          timeout: 15000,
          headers: {
            Accept: 'application/json',
            'User-Agent': 'booking-manager/1.0 (+https://pixelnova.es)'
          },
          validateStatus: s => s >= 200 && s < 300
        }
      );
      const holidays = Array.isArray(response.data) ? response.data : [];

      this.cache.set(cacheKey, {
        data: holidays,
        expires: Date.now() + this.CACHE_DURATION
      });

      return holidays;
    } catch (error: unknown) {
      const ax = error as { response?: { status?: number }; message?: string };
      const status = ax.response?.status;
      console.warn(
        `[holidays] No se pudieron cargar festivos ${year}/ES`,
        status != null ? `(HTTP ${status})` : ax.message || error
      );
      return [];
    }
  }

  async isHoliday(dateStr: string, provinceCode?: string): Promise<boolean> {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return false;
    }
    const year = parseInt(dateStr.slice(0, 4), 10);
    if (!Number.isFinite(year)) {
      return false;
    }
    const holidays = await this.getHolidays(year);

    return holidays.some(holiday => {
      if (holiday.date !== dateStr.slice(0, 10)) return false;

      // Si es festivo nacional (counties es null), es festivo para todos
      if (holiday.global || holiday.counties === null) return true;

      // Si tenemos código de provincia, comprobamos si está en la lista del festivo
      if (provinceCode && Array.isArray(holiday.counties) && holiday.counties.includes(`ES-${provinceCode}`)) {
        return true;
      }

      return false;
    });
  }
}

export const holidayService = new HolidayService();
