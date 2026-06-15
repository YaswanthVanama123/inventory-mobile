import React, {useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Typography} from '../components/atoms/Typography';
import {Button} from '../components/atoms/Button';
import {Card} from '../components/atoms/Card';
import {useTheme} from '../contexts/ThemeContext';
import {Theme} from '../theme';
import {
  BoxIcon,
  FileTextIcon,
  RefreshIcon,
  TruckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ShieldIcon,
  BarChartIcon,
} from '../components/icons';
import {RootStackParamList} from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

interface Feature {
  Icon: React.FC<{size?: number; color?: string}>;
  title: string;
  description: string;
  points: string[];
}

interface Highlight {
  Icon: React.FC<{size?: number; color?: string}>;
  label: string;
  detail: string;
}

export const WelcomeScreen: React.FC<Props> = ({navigation}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const features: Feature[] = [
    {
      Icon: BoxIcon,
      title: 'Inventory & Stock',
      description:
        'Track every SKU across locations with real-time stock levels and low-stock alerts.',
      points: ['Multi-location stock', 'Low-stock alerts', 'Adjustment history'],
    },
    {
      Icon: FileTextIcon,
      title: 'Orders & Invoicing',
      description:
        'Manage purchase orders, invoices, and an integrated point-of-sale from one workflow.',
      points: ['Purchase orders', 'Invoice management', 'Built-in POS'],
    },
    {
      Icon: RefreshIcon,
      title: 'External Sync',
      description:
        'Automated invoice and customer sync from RouteStar and CustomerConnect.',
      points: ['RouteStar invoices', 'CustomerConnect orders', 'Background sync'],
    },
    {
      Icon: TruckIcon,
      title: 'Truck Checkouts',
      description:
        'Field employees check inventory in and out of trucks with full reconciliation.',
      points: ['Per-truck inventory', 'Sales reconciliation', 'Discrepancy detection'],
    },
  ];

  const highlights: Highlight[] = [
    {Icon: ShieldIcon, label: 'Role-based access', detail: 'Admin and employee scopes'},
    {Icon: BarChartIcon, label: 'Reports & analytics', detail: 'Sales, low-stock, exports'},
  ];

  const handleSignIn = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background.primary}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <BoxIcon size={20} color={theme.colors.white} />
          </View>
          <Typography variant="small" weight="semibold" color={theme.colors.gray[900]}>
            Inventory Management System
          </Typography>
        </View>

        <View style={styles.hero}>
          <View style={styles.badge}>
            <Typography variant="caption" weight="semibold" color={theme.colors.primary[700]}>
              BUILT FOR OPERATIONS TEAMS
            </Typography>
          </View>
          <Typography variant="h1" weight="bold" style={styles.heroTitle}>
            Run your inventory,{' '}
            <Typography variant="h1" weight="bold" color={theme.colors.primary[600]}>
              end to end.
            </Typography>
          </Typography>
          <Typography
            variant="body"
            color={theme.colors.gray[600]}
            style={styles.heroSubtitle}>
            One workspace for stock, purchase orders, invoices, RouteStar sync, and truck
            checkouts. Web and mobile, with the same data.
          </Typography>

          <Button
            title="Sign in to your workspace"
            variant="primary"
            size="lg"
            fullWidth
            rightIcon={<ArrowRightIcon size={18} color={theme.colors.white} />}
            onPress={handleSignIn}
            style={styles.heroCta}
          />

          <View style={styles.highlightsRow}>
            {highlights.map(h => (
              <View key={h.label} style={styles.highlight}>
                <h.Icon size={18} color={theme.colors.primary[600]} />
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

        <View style={styles.featuresSection}>
          <Typography variant="h2" weight="bold" style={styles.sectionTitle}>
            Everything your team needs
          </Typography>
          <Typography
            variant="body"
            color={theme.colors.gray[600]}
            style={styles.sectionSubtitle}>
            Designed for the way real inventory work happens.
          </Typography>

          {features.map(feature => (
            <Card key={feature.title} style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <feature.Icon size={22} color={theme.colors.primary[600]} />
              </View>
              <Typography variant="h4" weight="semibold" style={styles.featureTitle}>
                {feature.title}
              </Typography>
              <Typography
                variant="small"
                color={theme.colors.gray[600]}
                style={styles.featureDesc}>
                {feature.description}
              </Typography>
              <View style={styles.featurePoints}>
                {feature.points.map(p => (
                  <View key={p} style={styles.featurePoint}>
                    <CheckCircleIcon size={16} color={theme.colors.primary[600]} />
                    <Typography
                      variant="small"
                      color={theme.colors.gray[700]}
                      style={styles.featurePointText}>
                      {p}
                    </Typography>
                  </View>
                ))}
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.ctaCard}>
          <Typography
            variant="h3"
            weight="bold"
            color={theme.colors.white}
            align="center"
            style={styles.ctaTitle}>
            Ready to get back to work?
          </Typography>
          <Typography
            variant="small"
            color={theme.colors.primary[100]}
            align="center"
            style={styles.ctaSubtitle}>
            Sign in to manage stock, run point of sale, and reconcile truck inventory.
          </Typography>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleSignIn}
            activeOpacity={0.85}>
            <Typography variant="body" weight="semibold" color={theme.colors.primary[700]}>
              Sign In
            </Typography>
            <ArrowRightIcon size={18} color={theme.colors.primary[700]} />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Typography variant="caption" color={theme.colors.gray[500]} align="center">
            © {new Date().getFullYear()} Inventory Management System
          </Typography>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xxl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    logoMark: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.colors.primary[600],
      alignItems: 'center',
      justifyContent: 'center',
    },
    hero: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      backgroundColor: theme.colors.primary[50],
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.primary[100],
      marginBottom: theme.spacing.md,
    },
    heroTitle: {
      marginBottom: theme.spacing.md,
    },
    heroSubtitle: {
      marginBottom: theme.spacing.lg,
    },
    heroCta: {
      marginBottom: theme.spacing.lg,
    },
    highlightsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    highlight: {
      flex: 1,
      minWidth: 150,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.white,
      borderRadius: 10,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    highlightText: {
      flex: 1,
    },
    featuresSection: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
    },
    sectionTitle: {
      marginBottom: theme.spacing.xs,
    },
    sectionSubtitle: {
      marginBottom: theme.spacing.lg,
    },
    featureCard: {
      marginBottom: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    featureIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    featureTitle: {
      marginBottom: theme.spacing.xs,
    },
    featureDesc: {
      marginBottom: theme.spacing.md,
      lineHeight: 20,
    },
    featurePoints: {
      gap: theme.spacing.xs,
    },
    featurePoint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    featurePointText: {
      flex: 1,
    },
    ctaCard: {
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.xl,
      padding: theme.spacing.xl,
      borderRadius: 20,
      backgroundColor: theme.colors.primary[600],
      alignItems: 'center',
    },
    ctaTitle: {
      marginBottom: theme.spacing.sm,
    },
    ctaSubtitle: {
      marginBottom: theme.spacing.lg,
    },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.white,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: 10,
    },
    footer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
    },
  });
