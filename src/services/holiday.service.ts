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
    const cacheKey = `ES-${year}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    try {
      const response = await axios.get<Holiday[]>(`https://date.nager.at/api/v3/PublicHolidays/${year}/ES`);
      const holidays = response.data;
      
      this.cache.set(cacheKey, {
        data: holidays,
        expires: Date.now() + this.CACHE_DURATION
      });

      return holidays;
    } catch (error) {
      console.error('Error fetching holidays:', error);
      return [];
    }
  }

  async isHoliday(dateStr: string, provinceCode?: string): Promise<boolean> {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const holidays = await this.getHolidays(year);

    return holidays.some(holiday => {
      if (holiday.date !== dateStr) return false;

      // Si es festivo nacional (counties es null), es festivo para todos
      if (holiday.global || holiday.counties === null) return true;

      // Si tenemos código de provincia, comprobamos si está en la lista del festivo
      if (provinceCode && holiday.counties.includes(`ES-${provinceCode}`)) {
        return true;
      }

      return false;
    });
  }
}

export const holidayService = new HolidayService();
