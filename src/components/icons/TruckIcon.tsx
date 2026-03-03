import React from 'react';
import {Path, Svg} from 'react-native-svg';

interface TruckIconProps {
  size?: number;
  color?: string;
}

export const TruckIcon: React.FC<TruckIconProps> = ({
  size = 24,
  color = 'currentColor',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 3H15V13H1V3Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 7H19L23 11V13H15V7Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.5 18C6.88071 18 8 16.8807 8 15.5C8 14.1193 6.88071 13 5.5 13C4.11929 13 3 14.1193 3 15.5C3 16.8807 4.11929 18 5.5 18Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.5 18C19.8807 18 21 16.8807 21 15.5C21 14.1193 19.8807 13 18.5 13C17.1193 13 16 14.1193 16 15.5C16 16.8807 17.1193 18 18.5 18Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
