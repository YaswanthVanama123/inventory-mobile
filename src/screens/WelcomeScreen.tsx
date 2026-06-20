import React, {useEffect, useMemo, useRef} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Typography} from '../components/atoms/Typography';
import {Button} from '../components/atoms/Button';
import {Card} from '../components/atoms/Card';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {useBreakpoint, BreakpointInfo} from '../utils/breakpoints';
import {
  BoxIcon,
  FileTextIcon,
  RefreshIcon,
  TruckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ShieldIcon,
  BarChartIcon,
  GridIcon,
  TimelineIcon,
  ClockIcon,
  DollarIcon,
} from '../components/icons';
import {RootStackParamList} from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

interface FeatureTile {
  Icon: React.FC<{size?: number; color?: string}>;
  title: string;
  description: string;
  tone: 'primary' | 'accent' | 'success' | 'warning';
}

interface Highlight {
  Icon: React.FC<{size?: number; color?: string}>;
  label: string;
  detail: string;
}

interface Step {
  number: string;
  title: string;
  detail: string;
}

interface Stat {
  value: string;
  label: string;
}

interface PreviewMetric {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down';
}

export const WelcomeScreen: React.FC<Props> = ({navigation}) => {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, breakpoint), [theme, breakpoint]);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const heroPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
      Animated.timing(slide, {toValue: 0, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(heroPulse, {toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
        Animated.timing(heroPulse, {toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
      ]),
    ).start();
  }, [fade, slide, heroPulse]);

  const features: FeatureTile[] = [
    {Icon: BoxIcon, title: 'Inventory & Stock', description: 'Real-time levels, low-stock alerts, history.', tone: 'primary'},
    {Icon: FileTextIcon, title: 'Orders & POS', description: 'Purchase orders, invoices, point-of-sale.', tone: 'accent'},
    {Icon: RefreshIcon, title: 'External Sync', description: 'RouteStar + CustomerConnect, automated.', tone: 'success'},
    {Icon: TruckIcon, title: 'Truck Checkouts', description: 'Field reconciliation, discrepancy alerts.', tone: 'warning'},
  ];

  const highlights: Highlight[] = [
    {Icon: ShieldIcon, label: 'Role-based access', detail: 'Admin & employee scopes'},
    {Icon: BarChartIcon, label: 'Reports & analytics', detail: 'Sales, low-stock, exports'},
    {Icon: GridIcon, label: 'Mobile + web', detail: 'Same data, every device'},
    {Icon: ClockIcon, label: 'Background sync', detail: 'Always up to date'},
  ];

  const steps: Step[] = [
    {number: '01', title: 'Sign in', detail: 'Use your workspace credentials.'},
    {number: '02', title: 'Pick your tab', detail: 'Inventory, orders, checkouts, reports.'},
    {number: '03', title: 'Get to work', detail: 'Web, iPad, and mobile stay in sync.'},
  ];

  const stats: Stat[] = [
    {value: '12+', label: 'Workflows'},
    {value: '2', label: 'Sync sources'},
    {value: '24/7', label: 'Always live'},
  ];

  const previewMetrics: PreviewMetric[] = [
    {label: 'Stock value', value: '$184.2k', delta: '+4.2%', trend: 'up'},
    {label: 'Orders today', value: '37', delta: '+12', trend: 'up'},
    {label: 'Low stock', value: '6', delta: '-2', trend: 'down'},
  ];

  const handleSignIn = () => navigation.navigate('Login');

  const blobScale = heroPulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]});
  const blobOpacity = heroPulse.interpolate({inputRange: [0, 1], outputRange: [0.18, 0.28]});

  const toneStyles = (tone: FeatureTile['tone']) => {
    const palette = theme.colors[tone];
    const isDark = theme.mode === 'dark';
    return {
      tile: {
        backgroundColor: isDark ? theme.colors.gray[100] : palette[50],
        borderColor: isDark ? palette[400] : theme.colors.gray[200],
      },
      iconWrap: {backgroundColor: isDark ? palette[400] : palette[100]},
      iconColor: isDark ? theme.colors.white : palette[600],
      accent: palette[isDark ? 400 : 600],
    };
  };

  const wide = !breakpoint.isMobile;

  const renderPreviewCard = (style?: any) => (
    <Card style={[styles.previewCard, style]} padding="none">
      <View style={styles.previewHeader}>
        <View style={styles.previewDots}>
          <View style={[styles.previewDotItem, {backgroundColor: '#ef4444'}]} />
          <View style={[styles.previewDotItem, {backgroundColor: '#f59e0b'}]} />
          <View style={[styles.previewDotItem, {backgroundColor: '#22c55e'}]} />
        </View>
        <Typography variant="caption" weight="semibold" color={theme.colors.gray[500]}>
          today · live snapshot
        </Typography>
      </View>

      <View style={styles.previewMetrics}>
        {previewMetrics.map(m => (
          <View key={m.label} style={styles.previewMetric}>
            <Typography variant="caption" color={theme.colors.gray[500]}>
              {m.label}
            </Typography>
            <Typography variant="h3" weight="bold">
              {m.value}
            </Typography>
            <View
              style={[
                styles.deltaPill,
                {backgroundColor: m.trend === 'up' ? theme.colors.success[50] : theme.colors.warning[50]},
              ]}>
              <Typography
                variant="caption"
                weight="semibold"
                color={m.trend === 'up' ? theme.colors.success[700] : theme.colors.warning[700]}>
                {m.delta}
              </Typography>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.previewDivider} />

      <View style={styles.previewActivity}>
        <View style={styles.previewActivityHeader}>
          <TimelineIcon size={16} color={theme.colors.primary[600]} />
          <Typography variant="small" weight="semibold">
            Recent activity
          </Typography>
        </View>
        <View style={styles.previewActivityRow}>
          <View style={[styles.activityIconWrap, {backgroundColor: theme.colors.success[50]}]}>
            <CheckCircleIcon size={14} color={theme.colors.success[600]} />
          </View>
          <View style={styles.activityTextWrap}>
            <Typography variant="small" weight="semibold">
              Invoice #INV-2418 verified
            </Typography>
            <Typography variant="caption" color={theme.colors.gray[500]}>
              2 minutes ago
            </Typography>
          </View>
          <Typography variant="small" weight="semibold" color={theme.colors.success[700]}>
            +$1,240
          </Typography>
        </View>
        <View style={styles.previewActivityRow}>
          <View style={[styles.activityIconWrap, {backgroundColor: theme.colors.primary[50]}]}>
            <RefreshIcon size={14} color={theme.colors.primary[600]} />
          </View>
          <View style={styles.activityTextWrap}>
            <Typography variant="small" weight="semibold">
              RouteStar sync · 23 invoices
            </Typography>
            <Typography variant="caption" color={theme.colors.gray[500]}>
              7 minutes ago
            </Typography>
          </View>
          <DollarIcon size={14} color={theme.colors.gray[500]} />
        </View>
      </View>
    </Card>
  );

  const renderHeroContent = () => (
    <Animated.View
      style={[styles.heroContent, {opacity: fade, transform: [{translateY: slide}]}]}>
      <View style={styles.statusChip}>
        <View style={styles.statusDot} />
        <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
          Live · all systems syncing
        </Typography>
      </View>

      <Typography
        variant="h1"
        weight="bold"
        color={theme.colors.brand.text}
        style={styles.heroTitle}>
        Run your inventory{'\n'}with confidence.
      </Typography>
      <Typography
        variant="body"
        color={theme.colors.brand.textMuted}
        style={styles.heroSubtitle}>
        One workspace for stock, orders, invoices, RouteStar sync and truck checkouts. Same data on web, iPad and mobile.
      </Typography>

      <View style={styles.ctaRow}>
        <Button
          title="Sign in"
          variant="primary"
          size="lg"
          rightIcon={<ArrowRightIcon size={18} color={theme.colors.brand.bg} />}
          onPress={handleSignIn}
          style={wide ? {...styles.primaryCta, flex: 0, paddingHorizontal: 28} : styles.primaryCta}
          textStyle={{color: theme.colors.brand.bg}}
        />
        <TouchableOpacity style={styles.secondaryCta} onPress={handleSignIn} activeOpacity={0.85}>
          <Typography variant="body" weight="semibold" color={theme.colors.brand.text}>
            Take a tour
          </Typography>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {stats.map((s, idx) => (
          <View key={s.label} style={styles.statCell}>
            <Typography variant="h3" weight="bold" color={theme.colors.brand.text}>
              {s.value}
            </Typography>
            <Typography variant="caption" weight="semibold" color={theme.colors.brand.textMuted}>
              {s.label.toUpperCase()}
            </Typography>
            {idx < stats.length - 1 && <View style={styles.statDivider} />}
          </View>
        ))}
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.brand.bg}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, {paddingTop: insets.top + theme.spacing.md}]}>
          <Animated.View
            style={[styles.blob, styles.blobOne, {transform: [{scale: blobScale}], opacity: blobOpacity}]}
          />
          <Animated.View
            style={[styles.blob, styles.blobTwo, {transform: [{scale: blobScale}], opacity: blobOpacity}]}
          />
          <View style={styles.dotGrid} pointerEvents="none">
            {Array.from({length: wide ? 32 : 18}).map((_, i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>

          <View style={styles.heroInner}>
            <View style={styles.brandRow}>
              <View style={styles.logoMark}>
                <BoxIcon size={20} color={theme.colors.brand.text} />
              </View>
              <Typography variant="small" weight="semibold" color={theme.colors.brand.text}>
                Inventory NVA
              </Typography>
              <View style={styles.versionPill}>
                <Typography variant="caption" weight="semibold" color={theme.colors.brand.text}>
                  v2.6
                </Typography>
              </View>
            </View>

            {wide ? (
              <View style={styles.heroSplit}>
                <View style={styles.heroSplitLeft}>{renderHeroContent()}</View>
                <Animated.View
                  style={[
                    styles.heroSplitRight,
                    {opacity: fade, transform: [{translateY: slide}]},
                  ]}>
                  {renderPreviewCard(styles.previewInline)}
                </Animated.View>
              </View>
            ) : (
              renderHeroContent()
            )}
          </View>
        </View>

        {!wide && (
          <Animated.View
            style={[styles.previewWrap, {opacity: fade, transform: [{translateY: slide}]}]}>
            {renderPreviewCard()}
          </Animated.View>
        )}

        <View style={styles.contentContainer}>
          <View style={styles.featuresSection}>
            <View style={styles.sectionEyebrow}>
              <View style={styles.eyebrowLine} />
              <Typography variant="caption" weight="semibold" color={theme.colors.primary[600]}>
                CAPABILITIES
              </Typography>
            </View>
            <Typography
              variant="h2"
              weight="bold"
              style={styles.sectionTitle}>
              Everything your team needs
            </Typography>
            <Typography
              variant="body"
              color={theme.colors.gray[600]}
              style={styles.sectionSubtitle}>
              Designed for the way real inventory work happens.
            </Typography>

            <View style={styles.featureGrid}>
              {features.map(feature => {
                const t = toneStyles(feature.tone);
                return (
                  <View key={feature.title} style={styles.featureTile}>
                    <View
                      style={[
                        styles.featureTileInner,
                        t.tile,
                        wide && styles.featureTileInnerWide,
                      ]}>
                      <View style={[styles.featureIconWrap, t.iconWrap]}>
                        <feature.Icon size={breakpoint.isWide ? 26 : breakpoint.isDesktop ? 24 : 20} color={t.iconColor} />
                      </View>
                      <Typography variant="small" weight="bold" style={styles.featureTitle}>
                        {feature.title}
                      </Typography>
                      <Typography variant="caption" color={theme.colors.gray[600]} style={styles.featureDesc}>
                        {feature.description}
                      </Typography>
                      <View style={[styles.featureAccent, {backgroundColor: t.accent}]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.highlightsSection}>
            <Typography
              variant="h3"
              weight="bold"
              style={styles.sectionTitle}>
              Built for operations teams
            </Typography>
            <View style={styles.highlightsGrid}>
              {highlights.map(h => (
                <View key={h.label} style={styles.highlight}>
                  <View style={styles.highlightIconWrap}>
                    <h.Icon size={18} color={theme.colors.primary[600]} />
                  </View>
                  <View style={styles.highlightText}>
                    <Typography variant="small" weight="semibold">
                      {h.label}
                    </Typography>
                    <Typography variant="caption" color={theme.colors.gray[600]}>
                      {h.detail}
                    </Typography>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.stepsSection}>
            <Typography
              variant="h3"
              weight="bold"
              style={styles.sectionTitle}>
              How it works
            </Typography>
            <View style={styles.stepsList}>
              {steps.map((step, idx) => (
                <View key={step.number} style={styles.stepRow}>
                  {!wide && (
                    <View style={styles.stepLeft}>
                      <View style={styles.stepNumberWrap}>
                        <Typography variant="small" weight="bold" color={theme.colors.primary[700]}>
                          {step.number}
                        </Typography>
                      </View>
                      {idx < steps.length - 1 && <View style={styles.stepConnector} />}
                    </View>
                  )}
                  <View style={styles.stepContent}>
                    {wide && (
                      <View style={styles.stepNumberWrapHorizontal}>
                        <Typography variant="small" weight="bold" color={theme.colors.primary[700]}>
                          {step.number}
                        </Typography>
                      </View>
                    )}
                    <Typography variant="body" weight="semibold" style={{marginBottom: 4}}>
                      {step.title}
                    </Typography>
                    <Typography variant="small" color={theme.colors.gray[600]}>
                      {step.detail}
                    </Typography>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.ctaCard}>
            <View style={[styles.blob, styles.ctaBlobOne]} />
            <View style={[styles.blob, styles.ctaBlobTwo]} />
            <Typography
              variant="caption"
              weight="semibold"
              color={theme.colors.brand.textTracked}
              align="center"
              style={styles.ctaEyebrow}>
              READY WHEN YOU ARE
            </Typography>
            <Typography
              variant="h2"
              weight="bold"
              color={theme.colors.brand.text}
              align="center"
              style={styles.ctaTitle}>
              Get back to work.
            </Typography>
            <Typography
              variant="small"
              color={theme.colors.brand.textMuted}
              align="center"
              style={styles.ctaSubtitle}>
              Sign in to manage stock, run point of sale, and reconcile truck inventory.
            </Typography>
            <TouchableOpacity style={styles.ctaButton} onPress={handleSignIn} activeOpacity={0.85}>
              <Typography variant="body" weight="semibold" color={theme.colors.brand.bg}>
                Sign in to your workspace
              </Typography>
              <ArrowRightIcon size={18} color={theme.colors.brand.bg} />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Typography variant="caption" color={theme.colors.gray[500]} align="center">
              © {new Date().getFullYear()} Inventory Management System
            </Typography>
            <Typography
              variant="caption"
              color={theme.colors.gray[400]}
              align="center"
              style={styles.footerSub}>
              Crafted for operations teams that care about the details.
            </Typography>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: Theme, bp: BreakpointInfo) => {
  const wide = !bp.isMobile;
  const isWide = bp.isWide;
  const isDesktop = bp.isDesktop;
  const actionBtnMaxWidth = isWide ? 560 : isDesktop ? 480 : undefined;
  const btnPadScale = isWide ? 1.3 : isDesktop ? 1.15 : 1;
  const rb = (n: number) => Math.round(n);

  const containerH = bp.gutter;
  const tileColumns = isWide ? 4 : isDesktop ? 4 : bp.isTablet ? 3 : 2;
  const highlightColumns = isWide ? 4 : isDesktop ? 4 : bp.isTablet ? 4 : 2;
  const stepColumns = wide ? 3 : 1;
  const tileGap = wide ? 16 : 12;

  const tileBasis = `${100 / tileColumns}%`;
  const highlightBasis = `${100 / highlightColumns}%`;

  return StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: theme.colors.background.primary},
    scroll: {flex: 1},
    scrollContent: {paddingBottom: theme.spacing.xxl},

    hero: {
      backgroundColor: theme.colors.brand.bg,
      borderBottomLeftRadius: wide ? 40 : 32,
      borderBottomRightRadius: wide ? 40 : 32,
      overflow: 'hidden',
      position: 'relative',
      paddingHorizontal: containerH,
      paddingTop: theme.spacing.md,
      paddingBottom: wide ? theme.spacing.xxl : theme.spacing.xl,
    },
    blob: {position: 'absolute', borderRadius: 9999},
    blobOne: {
      width: wide ? 460 : 320, height: wide ? 460 : 320,
      top: wide ? -180 : -120, right: wide ? -160 : -100,
      backgroundColor: theme.colors.brand.surfaceTint,
    },
    blobTwo: {
      width: wide ? 340 : 240, height: wide ? 340 : 240,
      bottom: wide ? -140 : -90, left: wide ? -100 : -60,
      backgroundColor: theme.colors.brand.accentTint,
    },
    dotGrid: {
      position: 'absolute',
      top: 90,
      right: 32,
      width: wide ? 160 : 90,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      opacity: 0.18,
    },
    dot: {width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.brand.text},

    heroInner: {
      maxWidth: bp.contentMaxWidth,
      width: '100%',
      alignSelf: 'center',
      zIndex: 2,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: wide ? theme.spacing.xxl : theme.spacing.xl,
    },
    logoMark: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: theme.colors.brand.glassBgStrong,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: theme.colors.brand.glassBorderStrong,
    },
    versionPill: {
      marginLeft: 'auto',
      paddingHorizontal: 10, paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: theme.colors.brand.glassBg,
      borderWidth: 1, borderColor: theme.colors.brand.glassBorder,
    },

    heroSplit: {
      flexDirection: 'row',
      gap: 40,
      alignItems: 'center',
    },
    heroSplitLeft: {flex: 1, maxWidth: '55%'},
    heroSplitRight: {flex: 1, maxWidth: '45%'},
    previewInline: {
      transform: [{rotate: isWide ? '-1.5deg' : '0deg'}],
    },

    heroContent: {},
    statusChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.brand.glassBg,
      borderWidth: 1, borderColor: theme.colors.brand.glassBorder,
      marginBottom: theme.spacing.lg,
    },
    statusDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.brand.successDot},

    heroTitle: {
      letterSpacing: -0.6,
      marginBottom: theme.spacing.md,
    },
    heroSubtitle: {
      lineHeight: 24,
      marginBottom: theme.spacing.lg,
      maxWidth: wide ? 560 : '100%',
    },

    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
      maxWidth: actionBtnMaxWidth,
      alignSelf: actionBtnMaxWidth ? 'center' : 'stretch',
    },
    primaryCta: {flex: 1, backgroundColor: theme.colors.brand.text},
    secondaryCta: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.brand.glassBorderStrong,
      backgroundColor: theme.colors.brand.glassBg,
    },

    statsRow: {flexDirection: 'row', alignItems: 'center'},
    statCell: {flex: 1, position: 'relative', paddingRight: theme.spacing.sm},
    statDivider: {
      position: 'absolute',
      right: 0, top: 4, bottom: 4,
      width: 1,
      backgroundColor: theme.colors.brand.glassBorder,
    },

    previewWrap: {
      marginTop: -36,
      paddingHorizontal: containerH,
      zIndex: 3,
      maxWidth: bp.contentMaxWidth,
      width: '100%',
      alignSelf: 'center',
    },
    previewCard: {
      ...theme.shadows.lg,
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    previewDots: {flexDirection: 'row', gap: 6},
    previewDotItem: {width: 9, height: 9, borderRadius: 5},
    previewMetrics: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    previewMetric: {flex: 1, gap: 2},
    deltaPill: {
      alignSelf: 'flex-start',
      marginTop: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    previewDivider: {
      height: 1,
      marginHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.gray[200],
    },
    previewActivity: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    previewActivityHeader: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2},
    previewActivityRow: {flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm},
    activityIconWrap: {width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
    activityTextWrap: {flex: 1},

    contentContainer: {
      maxWidth: bp.contentMaxWidth,
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: containerH,
    },

    sectionEyebrow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    eyebrowLine: {width: 24, height: 2, borderRadius: 1, backgroundColor: theme.colors.primary[600]},
    featuresSection: {paddingTop: wide ? theme.spacing.xxl : theme.spacing.xl},
    sectionTitle: {marginBottom: theme.spacing.xs, letterSpacing: -0.3},
    sectionSubtitle: {marginBottom: theme.spacing.lg, lineHeight: 22},

    featureGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -tileGap / 2,
    },
    featureTile: {
      flexBasis: tileBasis as any,
      paddingHorizontal: tileGap / 2,
      marginBottom: tileGap,
    },
    featureTileInner: {
      borderRadius: 18,
      padding: wide ? 22 : 16,
      borderWidth: 1,
      position: 'relative',
      overflow: 'hidden',
      minHeight: wide ? 200 : 160,
    },
    featureTileInnerWide: {
      ...theme.shadows.xs,
    },

    featureIconWrap: {
      width: wide ? 48 : 38,
      height: wide ? 48 : 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    },
    featureTitle: {marginBottom: 4},
    featureDesc: {lineHeight: 18},
    featureAccent: {
      position: 'absolute',
      left: 0,
      bottom: 0,
      width: wide ? 56 : 36,
      height: 3,
      borderTopRightRadius: 3,
    },

    highlightsSection: {paddingTop: theme.spacing.xl},
    highlightsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: theme.spacing.md,
      marginHorizontal: -tileGap / 2,
    },
    highlight: {
      flexBasis: highlightBasis as any,
      paddingHorizontal: tileGap / 2,
      marginBottom: tileGap,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    highlightIconWrap: {
      width: 36, height: 36, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: theme.colors.primary[50],
      borderWidth: 1, borderColor: theme.colors.primary[100],
    },
    highlightText: {flex: 1},

    stepsSection: {paddingTop: theme.spacing.xl},
    stepsList: {
      marginTop: theme.spacing.md,
      flexDirection: stepColumns === 3 ? 'row' : 'column',
      gap: wide ? 16 : 0,
    },
    stepRow: {
      flexDirection: stepColumns === 3 ? 'column' : 'row',
      flex: stepColumns === 3 ? 1 : undefined,
      gap: stepColumns === 3 ? 0 : theme.spacing.md,
    },
    stepLeft: {width: 36, alignItems: 'center'},
    stepNumberWrap: {
      width: 36, height: 36, borderRadius: 12,
      backgroundColor: theme.colors.primary[50],
      borderWidth: 1, borderColor: theme.colors.primary[100],
      alignItems: 'center', justifyContent: 'center',
    },
    stepNumberWrapHorizontal: {
      alignSelf: 'flex-start',
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: theme.colors.primary[50],
      borderWidth: 1, borderColor: theme.colors.primary[100],
      alignItems: 'center', justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    },
    stepConnector: {
      flex: 1,
      width: 2,
      backgroundColor: theme.colors.primary[100],
      marginTop: 4, marginBottom: 4,
    },
    stepContent: {
      flex: stepColumns === 3 ? 0 : 1,
      paddingBottom: stepColumns === 3 ? 0 : theme.spacing.lg,
      backgroundColor: stepColumns === 3 ? theme.colors.background.secondary : 'transparent',
      borderRadius: stepColumns === 3 ? 16 : 0,
      padding: stepColumns === 3 ? theme.spacing.lg : 0,
      borderWidth: stepColumns === 3 ? 1 : 0,
      borderColor: theme.colors.gray[200],
    },

    ctaCard: {
      marginTop: theme.spacing.xl,
      padding: wide ? theme.spacing.xxl : theme.spacing.xl,
      borderRadius: 24,
      backgroundColor: theme.colors.brand.bgDeep,
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
    },
    ctaBlobOne: {
      width: 240, height: 240,
      top: -80, right: -60,
      backgroundColor: theme.colors.brand.bgSoft,
      opacity: 0.55,
    },
    ctaBlobTwo: {
      width: 200, height: 200,
      bottom: -60, left: -40,
      backgroundColor: theme.colors.brand.accentTint,
      opacity: 0.4,
    },
    ctaEyebrow: {letterSpacing: 1.5, marginBottom: theme.spacing.sm, zIndex: 2},
    ctaTitle: {marginBottom: theme.spacing.sm, zIndex: 2, letterSpacing: -0.4},
    ctaSubtitle: {marginBottom: theme.spacing.lg, zIndex: 2, maxWidth: wide ? 560 : '100%'},
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.brand.text,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: rb(theme.spacing.md * btnPadScale),
      borderRadius: 12,
      ...theme.shadows.md,
      zIndex: 2,
      maxWidth: actionBtnMaxWidth,
      alignSelf: actionBtnMaxWidth ? 'center' : 'stretch',
    },

    footer: {
      paddingTop: theme.spacing.xl,
      gap: 4,
    },
    footerSub: {marginTop: 2},
  });
};
