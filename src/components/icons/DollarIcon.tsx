import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface DollarIconProps {
  size?: number;
  color?: string;
}

export const DollarIcon: React.FC<DollarIconProps> = ({
  size = 24,
  color = 'currentColor',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        stroke={color}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </Svg>
  );
};
