/**
 * Smartifly Checkbox Component
 * 
 * A premium styled checkbox for forms.
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
} from 'react-native';

// =============================================================================
// THEME COLORS
// =============================================================================

import { colors, spacing, borderRadius } from '../../../../theme';

// =============================================================================
// THEME COLORS
// =============================================================================
// Local definitions removed in favor of theme imports

// =============================================================================
// CHECKBOX PROPS
// =============================================================================

export interface CheckboxProps {
    /** Current checked state */
    checked: boolean;
    /** Called when checkbox is toggled */
    onChange: (checked: boolean) => void;
    /** Label text */
    label?: string;
    /** Sublabel text */
    sublabel?: string;
    /** Disabled state */
    disabled?: boolean;
    /** Container style */
    style?: ViewStyle;
    /** Checkbox color when checked */
    activeColor?: string;
}

// =============================================================================
// CHECKBOX COMPONENT
// =============================================================================

const Checkbox: React.FC<CheckboxProps> = ({
    checked,
    onChange,
    label,
    sublabel,
    disabled = false,
    style,
    activeColor = colors.accent,
}) => {
    const handlePress = () => {
        if (!disabled) {
            onChange(!checked);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.container, style]}
            onPress={handlePress}
            activeOpacity={0.7}
            disabled={disabled}
        >
            {/* Checkbox Box */}
            <View style={[
                styles.checkbox,
                checked && [styles.checkboxChecked, { backgroundColor: activeColor, borderColor: activeColor }],
                disabled && styles.checkboxDisabled,
            ]}>
                {checked && (
                    <Text style={styles.checkmark}>✓</Text>
                )}
            </View>

            {/* Label */}
            {(label || sublabel) && (
                <View style={styles.labelContainer}>
                    {label && (
                        <Text style={[
                            styles.label,
                            disabled && styles.labelDisabled,
                        ]}>
                            {label}
                        </Text>
                    )}
                    {sublabel && (
                        <Text style={styles.sublabel}>{sublabel}</Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: borderRadius.sm,
        borderWidth: 2,
        borderColor: colors.borderMedium,
        backgroundColor: colors.backgroundTertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        // backgroundColor and borderColor set dynamically
    },
    checkboxDisabled: {
        opacity: 0.5,
    },
    checkmark: {
        fontSize: 14,
        color: colors.background,
        fontWeight: '700',
    },
    labelContainer: {
        flex: 1,
        marginLeft: spacing.md,
    },
    label: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    labelDisabled: {
        color: colors.textMuted,
    },
    sublabel: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
});

export default Checkbox;