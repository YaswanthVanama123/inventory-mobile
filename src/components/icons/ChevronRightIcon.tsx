import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface ChevronRightIconProps {
  size?: number;
  color?: string;
}

export const ChevronRightIcon: React.FC<ChevronRightIconProps> = ({
  size = 20,
  color = 'currentColor',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        stroke={color}
        d="M9 5l7 7-7 7"
      />
    </Svg>
  );
};
