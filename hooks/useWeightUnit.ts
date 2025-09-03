import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import type { WeightUnit } from '@/utils/weights';
import { convertWeight as coreConvert, formatWeight as coreFormat } from '@/utils/weights';

const WEIGHT_UNIT_STORAGE_KEY = 'z-fit-weight-unit';

export function useWeightUnit() {
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>('kg');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadWeightUnit = async () => {
      try {
        const stored = await AsyncStorage.getItem(WEIGHT_UNIT_STORAGE_KEY);
        if (stored && ['kg', 'lbs'].includes(stored)) {
          setWeightUnitState(stored as WeightUnit);
        }
      } catch (error) {
        console.warn('Failed to load weight unit preference:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadWeightUnit();
  }, []);

  const setWeightUnit = async (unit: WeightUnit) => {
    try {
      await AsyncStorage.setItem(WEIGHT_UNIT_STORAGE_KEY, unit);
      setWeightUnitState(unit);
    } catch (error) {
      console.warn('Failed to save weight unit preference:', error);
    }
  };

  const convertWeight = (weight: number, fromUnit: WeightUnit, toUnit: WeightUnit): number => coreConvert(weight, fromUnit, toUnit);

  const formatWeight = (weight: number): string => coreFormat(weight, weightUnit);

  return {
    weightUnit,
    setWeightUnit,
    convertWeight,
    formatWeight,
    isLoaded,
  };
}
