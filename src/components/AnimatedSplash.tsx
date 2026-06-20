import React, {useEffect, useRef, useState} from 'react';
import {View, StyleSheet, Animated, Easing} from 'react-native';
import {useTheme} from '../contexts/ThemeContext';
import {Typography} from './atoms/Typography';
import {BoxIcon} from './icons';

interface AnimatedSplashProps {
  // When true, auth/bootstrap is still in progress — keep the splash up.
  holding?: boolean;
  // Called once the splash has finished its intro and faded out.
  onFinish: () => void;
}

const MIN_VISIBLE_MS = 1500;

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({holding = false, onFinish}) => {
  const theme = useTheme();

  const container = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const blob = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(14)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    // Ambient blob pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob, {toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
        Animated.timing(blob, {toValue: 0, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
      ]),
    ).start();

    // Expanding glow ring behind the logo
    Animated.loop(
      Animated.timing(ring, {toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true}),
    ).start();

    // Bouncing loading dots
    const bounce = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {toValue: 1, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: true}),
          Animated.timing(v, {toValue: 0, duration: 360, easing: Easing.in(Easing.quad), useNativeDriver: true}),
          Animated.delay(540 - delay),
        ]),
      );
    bounce(dot1, 0).start();
    bounce(dot2, 180).start();
    bounce(dot3, 360).start();

    // Entrance: logo pops, then wordmark rises
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {toValue: 1, tension: 60, friction: 6, useNativeDriver: true}),
        Animated.timing(logoOpacity, {toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
      ]),
      Animated.parallel([
        Animated.timing(textFade, {toValue: 1, duration: 450, useNativeDriver: true}),
        Animated.timing(textSlide, {toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
      ]),
    ]).start();

    const t = setTimeout(() => setIntroDone(true), MIN_VISIBLE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (introDone && !holding) {
      Animated.timing(container, {
        toValue: 0,
        duration: 480,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(({finished}) => {
        if (finished) onFinish();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introDone, holding]);

  const ringScale = ring.interpolate({inputRange: [0, 1], outputRange: [0.85, 1.7]});
  const ringOpacity = ring.interpolate({inputRange: [0, 0.5, 1], outputRange: [0, 0.35, 0]});
  const blobScale = blob.interpolate({inputRange: [0, 1], outputRange: [1, 1.12]});
  const blobOpacity = blob.interpolate({inputRange: [0, 1], outputRange: [0.16, 0.28]});
  const dotStyle = (v: Animated.Value) => ({
    transform: [{translateY: v.interpolate({inputRange: [0, 1], outputRange: [0, -8]})}],
    opacity: v.interpolate({inputRange: [0, 1], outputRange: [0.35, 1]}),
  });

  return (
    <Animated.View
      style={[styles.fill, {backgroundColor: theme.colors.brand.bg, opacity: container}]}
      pointerEvents="none">
      <Animated.View
        style={[
          styles.blob,
          styles.blobOne,
          {backgroundColor: theme.colors.brand.surfaceTint, transform: [{scale: blobScale}], opacity: blobOpacity},
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobTwo,
          {backgroundColor: theme.colors.brand.accentTint, transform: [{scale: blobScale}], opacity: blobOpacity},
        ]}
      />

      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <Animated.View
            style={[
              styles.ring,
              {borderColor: theme.colors.brand.text, transform: [{scale: ringScale}], opacity: ringOpacity},
            ]}
          />
          <Animated.View
            style={[
              styles.logoMark,
              {
                backgroundColor: theme.colors.brand.glassBgStrong,
                borderColor: theme.colors.brand.glassBorderStrong,
                opacity: logoOpacity,
                transform: [{scale: logoScale}],
              },
            ]}>
            <BoxIcon size={40} color={theme.colors.brand.text} />
          </Animated.View>
        </View>

        <Animated.View style={{opacity: textFade, transform: [{translateY: textSlide}], alignItems: 'center'}}>
          <Typography variant="h2" weight="bold" color={theme.colors.brand.text} style={styles.wordmark}>
            Inventory NVA
          </Typography>
          <Typography variant="small" color={theme.colors.brand.textMuted} style={styles.tagline}>
            Run your inventory with confidence
          </Typography>
        </Animated.View>
      </View>

      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, {backgroundColor: theme.colors.brand.text}, dotStyle(dot1)]} />
        <Animated.View style={[styles.dot, {backgroundColor: theme.colors.brand.text}, dotStyle(dot2)]} />
        <Animated.View style={[styles.dot, {backgroundColor: theme.colors.brand.text}, dotStyle(dot3)]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  blob: {position: 'absolute', borderRadius: 9999},
  blobOne: {width: 460, height: 460, top: -160, right: -150},
  blobTwo: {width: 360, height: 360, bottom: -150, left: -120},
  center: {alignItems: 'center', justifyContent: 'center'},
  logoWrap: {alignItems: 'center', justifyContent: 'center', marginBottom: 28},
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 2,
  },
  logoMark: {
    width: 88,
    height: 88,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {letterSpacing: -0.5},
  tagline: {marginTop: 6, letterSpacing: 0.2},
  dotsRow: {
    position: 'absolute',
    bottom: 64,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {width: 8, height: 8, borderRadius: 4},
});

export default AnimatedSplash;
