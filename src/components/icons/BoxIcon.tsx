import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface BoxIconProps {
  size?: number;
  color?: string;
}

export const BoxIcon: React.FC<BoxIconProps> = ({
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
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </Svg>
  );
};
