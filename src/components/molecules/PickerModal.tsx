import React, {useState} from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Typography} from '../atoms/Typography';
import {theme} from '../../theme';
import {CheckIcon, ChevronDownIcon} from '../icons';

interface PickerModalProps {
  visible: boolean;
  onClose: () => void;
  items: any[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  getLabel?: (item: any) => string;
  getValue?: (item: any) => string;
}

export const PickerModal: React.FC<PickerModalProps> = ({
  visible,
  onClose,
  items,
  selectedValue,
  onValueChange,
  placeholder = 'Select an option',
  getLabel = (item) => item.label || item.toString(),
  getValue = (item) => item.value || item._id || item,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter(item =>
    getLabel(item).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (item: any) => {
    onValueChange(getValue(item));
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Typography variant="body" color={theme.colors.primary[600]} weight="semibold">
              Cancel
            </Typography>
          </TouchableOpacity>
          <Typography variant="h3" weight="bold" style={styles.title}>
            {placeholder}
          </Typography>
          <View style={styles.closeButton} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.gray[400]}
          />
        </View>

        {/* List */}
        <FlatList
          data={filteredItems}
          keyExtractor={(item, index) => getValue(item) || index.toString()}
          renderItem={({item}) => {
            const isSelected = getValue(item) === selectedValue;
            return (
              <TouchableOpacity
                style={[styles.item, isSelected && styles.itemSelected]}
                onPress={() => handleSelect(item)}>
                <Typography
                  variant="body"
                  weight={isSelected ? 'semibold' : 'regular'}
                  color={isSelected ? theme.colors.primary[600] : theme.colors.gray[900]}
                  numberOfLines={2}
                  style={styles.itemText}>
                  {getLabel(item)}
                </Typography>
                {isSelected && (
                  <CheckIcon size={20} color={theme.colors.primary[600]} />
                )}
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Typography variant="body" color={theme.colors.gray[500]} align="center">
                No items found
              </Typography>
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  closeButton: {
    width: 60,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    padding: theme.spacing.lg,
  },
  searchInput: {
    backgroundColor: theme.colors.gray[100],
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.gray[900],
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  itemSelected: {
    backgroundColor: theme.colors.primary[50],
  },
  itemText: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.gray[200],
    marginHorizontal: theme.spacing.lg,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
});
