import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface XIconProps {
  size?: number;
  color?: string;
}

export const XIcon: React.FC<XIconProps> = ({
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
        d="M6 18L18 6M6 6l12 12"
      />
    </Svg>
  );
};
