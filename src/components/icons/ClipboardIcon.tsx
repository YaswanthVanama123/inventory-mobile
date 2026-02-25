import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface ClipboardIconProps {
  size?: number;
  color?: string;
}

export const ClipboardIcon: React.FC<ClipboardIconProps> = ({
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
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </Svg>
  );
};
