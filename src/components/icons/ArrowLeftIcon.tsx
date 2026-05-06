import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface ArrowLeftIconProps {
  size?: number;
  color?: string;
}

export const ArrowLeftIcon: React.FC<ArrowLeftIconProps> = ({
  size = 20,
  color = 'currentColor',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        stroke={color}
        d="M15 19l-7-7 7-7"
      />
    </Svg>
  );
};
