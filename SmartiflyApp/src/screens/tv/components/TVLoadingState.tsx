import React from 'react';
import { ActivityIndicator, StyleProp, View, ViewStyle } from 'react-native';
import { colors } from '../../../theme';

type TVLoadingStateProps = {
    size?: 'small' | 'large' | number;
    style?: StyleProp<ViewStyle>;
};

const TVLoadingState: React.FC<TVLoadingStateProps> = ({ size = 'small', style }) => (
    <View style={style}>
        <ActivityIndicator color={colors.primary} size={size} />
    </View>
);

export default TVLoadingState;
