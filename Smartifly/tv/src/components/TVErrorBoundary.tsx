import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, scale, scaleFont } from '../theme';
import { logger } from '../config';

type Props = {
    children: ReactNode;
    screenName?: string;
};

type State = {
    hasError: boolean;
    error: Error | null;
};

class TVErrorBoundary extends Component<Props, State> {
    state: State = {
        hasError: false,
        error: null,
    };

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error(`TVErrorBoundary caught error in ${this.props.screenName || 'unknown-screen'}`, {
            error: error.message,
            componentStack: errorInfo.componentStack,
        });
    }

    private handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
        });
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <View style={styles.container}>
                <Text style={styles.title}>Something went wrong</Text>
                <Text style={styles.message}>
                    This screen could not be rendered. You can retry without restarting the app.
                </Text>
                {__DEV__ && this.state.error ? (
                    <Text style={styles.debugText} numberOfLines={4}>
                        {this.state.error.message}
                    </Text>
                ) : null}
                <Pressable onPress={this.handleRetry} style={styles.button}>
                    <Text style={styles.buttonText}>Try Again</Text>
                </Pressable>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(36),
    },
    title: {
        color: colors.textPrimary,
        fontSize: scaleFont(26),
        fontWeight: '700',
        marginBottom: scale(14),
    },
    message: {
        color: colors.textSecondary,
        fontSize: scaleFont(16),
        textAlign: 'center',
        lineHeight: scale(26),
        marginBottom: scale(20),
        maxWidth: scale(620),
    },
    debugText: {
        color: colors.textMuted,
        fontSize: scaleFont(12),
        textAlign: 'center',
        marginBottom: scale(20),
        maxWidth: scale(760),
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: scale(14),
        paddingHorizontal: scale(28),
        paddingVertical: scale(14),
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: scaleFont(16),
        fontWeight: '700',
    },
});

export default TVErrorBoundary;
