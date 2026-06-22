/**
 * @format
 */

import { AppRegistry, Text, TextInput } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Keep the app's typography consistent across all devices. Without this, a
// device with a larger system font / display-size setting multiplies every
// font size, which overflows layouts and truncates text (e.g. input
// placeholders) on "some devices" but not others. We control sizing via the
// theme typography scale instead.
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.allowFontScaling = false;

AppRegistry.registerComponent(appName, () => App);
