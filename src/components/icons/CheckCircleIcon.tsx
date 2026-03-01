import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface CheckCircleIconProps {
  size?: number;
  color?: string;
}

export const CheckCircleIcon: React.FC<CheckCircleIconProps> = ({
  size = 32,
  color = 'currentColor',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        stroke={color}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </Svg>
  );
};
