import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface XCircleIconProps {
  size?: number;
  color?: string;
}

export const XCircleIcon: React.FC<XCircleIconProps> = ({
  size = 24,
  color = '#000',
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"
      fill={color}
    />
  </Svg>
);
