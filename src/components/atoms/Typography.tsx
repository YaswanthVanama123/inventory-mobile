import React, {useMemo} from 'react';
import {Text as RNText, TextProps as RNTextProps, StyleSheet, useWindowDimensions} from 'react-native';
import {useTheme} from '../../contexts/ThemeContext';
import {Theme} from '../../theme';
import {getBreakpoint} from '../../utils/breakpoints';
import {TextRole} from '../../theme/typography';

// Semantic roles + legacy aliases (so older variant names keep working).
type Variant =
  | 'heading'
  | 'subheading'
  | 'sideheading'
  | 'body'
  | 'caption'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'small'
  | 'body2';

const ROLE_ALIAS: Record<Variant, TextRole> = {
  heading: 'heading',
  subheading: 'subheading',
  sideheading: 'sideheading',
  body: 'body',
  caption: 'caption',
  // legacy names → roles
  h1: 'heading',
  h2: 'subheading',
  h3: 'sideheading',
  h4: 'sideheading',
  small: 'caption',
  body2: 'caption',
};

export interface TypographyProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  responsive?: boolean;
}

// Bigger screens (tablet/Mac) scale text up a touch.
const fontScaleByBreakpoint = (width: number): number => {
  const bp = getBreakpoint(width);
  if (bp === 'xl') return 1.36;
  if (bp === 'lg') return 1.24;
  if (bp === 'md') return 1.12;
  return 1;
};

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color,
  weight,
  align = 'left',
  responsive = true,
  style,
  ...props
}) => {
  const theme = useTheme();
  const {width} = useWindowDimensions();
  const scale = responsive ? fontScaleByBreakpoint(width) : 1;
  const role = ROLE_ALIAS[variant] ?? 'body';
  const styles = useMemo(() => makeStyles(theme, scale), [theme, scale]);
  const resolvedColor = color ?? theme.colors.gray[900];
  const resolvedWeight = weight ? theme.typography.fontWeights[weight] : undefined;
  return (
    <RNText
      {...props}
      style={[
        styles[role],
        {color: resolvedColor, textAlign: align},
        resolvedWeight ? {fontWeight: resolvedWeight} : null,
        style,
      ]}
    />
  );
};

const makeStyles = (theme: Theme, scale: number) => {
  const roles = theme.typography.roles;
  const build = (r: TextRole) => ({
    fontSize: Math.round(roles[r].fontSize * scale),
    lineHeight: Math.round(roles[r].lineHeight * scale),
    fontWeight: roles[r].fontWeight,
    letterSpacing: roles[r].letterSpacing,
  });
  return StyleSheet.create({
    heading: build('heading'),
    subheading: build('subheading'),
    sideheading: build('sideheading'),
    body: build('body'),
    caption: build('caption'),
  });
};
