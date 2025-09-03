import { Box, Text, VStack } from '@gluestack-ui/themed';
import { Dimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

interface WorkoutChartProps {
  data: any[];
  type: 'line' | 'bar';
  title: string;
  isDark?: boolean;
  labels?: string[];
}

export default function WorkoutChart({ data, type, title, isDark = false, labels }: WorkoutChartProps) {
  const chartConfig = {
    backgroundColor: isDark ? '#343A40' : '#FFFFFF',
    backgroundGradientFrom: isDark ? '#343A40' : '#F8F9FA',
    backgroundGradientTo: isDark ? '#495057' : '#E9ECEF',
    color: (opacity = 1) => isDark ? `rgba(248, 249, 250, ${opacity})` : `rgba(33, 37, 41, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(173, 181, 189, ${opacity})` : `rgba(108, 117, 125, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: isDark ? '#F8F9FA' : '#212529',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: isDark ? '#495057' : '#DEE2E6',
      strokeWidth: 1,
    },
    fillShadowGradient: isDark ? '#F8F9FA' : '#212529',
    fillShadowGradientOpacity: 0.1,
  };

  const chartData = {
    labels: labels || data.map((_, index) => `W${index + 1}`),
    datasets: [
      {
        data: data.length > 0 ? data : [0],
        color: (opacity = 1) => isDark ? `rgba(248, 249, 250, ${opacity})` : `rgba(33, 37, 41, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  if (data.length === 0) {
    return (
      <Box
        bg={isDark ? '$cardDark' : '$cardLight'}
        borderColor={isDark ? '$borderDark0' : '$borderLight0'}
        borderWidth={1}
        borderRadius={16}
        p={24}
        alignItems="center"
        justifyContent="center"
        minHeight={200}
      >
        <Text 
          color={isDark ? '$textDark200' : '$textLight200'}
          textAlign="center"
        >
          No workout data yet
        </Text>
      </Box>
    );
  }

  return (
    <VStack space="md">
      <Text 
        size="md" 
        fontWeight="$semibold" 
        color={isDark ? '$textDark0' : '$textLight0'}
      >
        {title}
      </Text>
      <Box
        bg={isDark ? '$cardDark' : '$cardLight'}
        borderColor={isDark ? '$borderDark0' : '$borderLight0'}
        borderWidth={1}
        borderRadius={16}
        p={16}
      >
        {type === 'line' ? (
          <LineChart
            data={chartData}
            width={width - 80}
            height={180}
            chartConfig={chartConfig}
            bezier
            style={{
              borderRadius: 8,
            }}
            withDots={true}
            withShadow={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
          />
        ) : (
          <BarChart
            data={chartData}
            width={width - 80}
            height={180}
            chartConfig={chartConfig}
            style={{
              borderRadius: 8,
            }}
            showValuesOnTopOfBars={true}
            withHorizontalLabels={true}
            withVerticalLabels={true}
          />
        )}
      </Box>
    </VStack>
  );
}

