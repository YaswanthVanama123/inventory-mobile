import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface ChevronUpIconProps {
  size?: number;
  color?: string;
}

export const ChevronUpIcon: React.FC<ChevronUpIconProps> = ({
  size = 24,
  color = '#000',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14l-6-6z"
      fill={color}
    />
  </Svg>
);
