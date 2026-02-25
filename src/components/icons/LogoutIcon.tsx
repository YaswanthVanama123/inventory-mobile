import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface LogoutIconProps {
  size?: number;
  color?: string;
}

export const LogoutIcon: React.FC<LogoutIconProps> = ({
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
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </Svg>
  );
};
