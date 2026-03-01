import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface ClockIconProps {
  size?: number;
  color?: string;
}

export const ClockIcon: React.FC<ClockIconProps> = ({
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
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </Svg>
  );
};
