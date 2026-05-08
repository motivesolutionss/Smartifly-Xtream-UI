package com.smartifly.tv.feature.account

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.smartifly.tv.ui.components.TvChip
import com.smartifly.tv.ui.components.TvFocusButton
import com.smartifly.tv.ui.design.TvTokens
import com.smartifly.tv.ui.preview.PreviewFrame
import com.smartifly.tv.ui.preview.previewPortals

@Composable
fun AccountSwitcherScreen(
    viewModel: AccountSwitcherViewModel,
    onDone: () -> Unit,
    onCancel: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    AccountSwitcherContent(
        state = state,
        onSavedAccountSelected = viewModel::selectSavedAccount,
        onPortalSelected = viewModel::selectPortal,
        onApply = {
            if (!state.isApplying) {
                viewModel.applySelection(onApplied = onDone)
            }
        },
        onRemoveSaved = viewModel::removeSelectedAccount,
        onCancel = onCancel,
    )
}

@Composable
private fun AccountSwitcherContent(
    state: AccountSwitcherState,
    onSavedAccountSelected: (String) -> Unit,
    onPortalSelected: (String) -> Unit,
    onApply: () -> Unit,
    onRemoveSaved: () -> Unit,
    onCancel: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 44.dp, vertical = 28.dp)
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Account Switcher",
                        style = MaterialTheme.typography.displaySmall,
                        color = TvTokens.Colors.TextPrimary
                    )
                    Text(
                        text = "Switch saved accounts instantly or choose a different service for a fresh login.",
                        style = MaterialTheme.typography.titleMedium,
                        color = TvTokens.Colors.TextSecondary
                    )
                }
            }

            if (state.savedAccounts.isNotEmpty()) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "SAVED ACCOUNTS",
                            style = MaterialTheme.typography.titleSmall,
                            color = TvTokens.Colors.TextSecondary
                        )
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(state.savedAccounts, key = { it.id }) { account ->
                                TvChip(
                                    text = "${account.username} - ${account.portal.name}",
                                    selected = state.selectedAccountId == account.id,
                                    onClick = { onSavedAccountSelected(account.id) }
                                )
                            }
                        }
                    }
                }
            }

            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "SERVICES",
                        style = MaterialTheme.typography.titleSmall,
                        color = TvTokens.Colors.TextSecondary
                    )
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(state.portals, key = { it.id }) { portal ->
                            TvChip(
                                text = portal.name,
                                selected = state.selectedPortalId == portal.id && state.selectedAccountId == null,
                                onClick = { onPortalSelected(portal.id) }
                            )
                        }
                    }
                }
            }

            item {
                val selectedAccount = state.selectedAccount
                val selectedPortal = state.selectedPortal
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, TvTokens.Colors.SurfaceBorder, RoundedCornerShape(14.dp))
                        .background(TvTokens.Colors.SurfaceMuted, RoundedCornerShape(14.dp))
                        .padding(horizontal = 14.dp, vertical = 12.dp)
                ) {
                    when {
                        selectedAccount != null -> Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = "User: ${selectedAccount.username}",
                                style = MaterialTheme.typography.titleMedium,
                                color = TvTokens.Colors.TextPrimary
                            )
                            Text(
                                text = "Service: ${selectedAccount.portal.name}",
                                style = MaterialTheme.typography.titleSmall,
                                color = TvTokens.Colors.TextSecondary
                            )
                            Text(
                                text = "Connections: ${selectedAccount.activeConnections}/${selectedAccount.maxConnections}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TvTokens.Colors.TextSecondary
                            )
                        }

                        selectedPortal != null -> Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = "Service: ${selectedPortal.name}",
                                style = MaterialTheme.typography.titleMedium,
                                color = TvTokens.Colors.TextPrimary
                            )
                            Text(
                                text = "Fresh login will start on this service.",
                                style = MaterialTheme.typography.titleSmall,
                                color = TvTokens.Colors.TextSecondary
                            )
                        }

                        else -> Text(
                            text = "No account or service selected.",
                            style = MaterialTheme.typography.titleMedium,
                            color = TvTokens.Colors.TextSecondary
                        )
                    }
                }
            }

            if (state.errorMessage != null) {
                item {
                    Text(
                        text = state.errorMessage.orEmpty(),
                        style = MaterialTheme.typography.bodyLarge,
                        color = TvTokens.Colors.Error
                    )
                }
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    TvFocusButton(
                        text = if (state.isApplying) {
                            "Switching..."
                        } else if (state.selectedAccountId != null) {
                            "Use Saved Account"
                        } else {
                            "Go To Login"
                        },
                        requestInitialFocus = true,
                        onClick = onApply
                    )
                    if (state.selectedAccountId != null) {
                        TvFocusButton(text = "Remove Saved", onClick = onRemoveSaved)
                    }
                    TvFocusButton(text = "Cancel", onClick = onCancel)
                }
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun AccountSwitcherScreenPreview() {
    PreviewFrame {
        AccountSwitcherContent(
            state = AccountSwitcherState(
                portals = previewPortals,
                selectedPortalId = previewPortals.first().id,
            ),
            onSavedAccountSelected = {},
            onPortalSelected = {},
            onApply = {},
            onRemoveSaved = {},
            onCancel = {},
        )
    }
}
