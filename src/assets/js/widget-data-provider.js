// LibraApps - Widget Data Provider
// Extracts data from HTML tools for Android widgets

class WidgetDataProvider {

    constructor() {
        this.lastUpdate = new Date();
    }

    // Extract LibraLeads widget data
    static extractLibraLeadsData() {
        try {
            const leadsData = localStorage.getItem('libra-leads');
            if (!leadsData) {
                return this.getLibraLeadsEmptyState();
            }

            const data = JSON.parse(leadsData);
            const leads = data.leads || [];
            const today = new Date().toISOString().split('T')[0];

            // Filter urgent tasks (today + overdue)
            const urgentTasks = leads.filter(lead => {
                if (!lead.nextFollowupDate) return false;
                const followupDate = new Date(lead.nextFollowupDate);
                const todayDate = new Date(today);
                return followupDate <= todayDate && lead.followupPriority === 'urgent';
            });

            // Filter this week's tasks
            const thisWeekTasks = leads.filter(lead => {
                if (!lead.nextFollowupDate) return false;
                const followupDate = new Date(lead.nextFollowupDate);
                const weekFromNow = new Date();
                weekFromNow.setDate(weekFromNow.getDate() + 7);
                return followupDate <= weekFromNow &&
                       followupDate > new Date(today) &&
                       lead.followupPriority !== 'urgent';
            });

            // Calculate pipeline value
            const pipelineValue = leads
                .filter(lead => lead.status === 'response' || lead.status === 'meeting')
                .reduce((sum, lead) => sum + (parseInt(lead.dealSize) || 0), 0);

            // Format urgent tasks for widget
            const urgentFormatted = urgentTasks.slice(0, 3).map(task => ({
                company: task.company || 'Unknown',
                action: task.followupAction || 'Follow-up',
                time: task.nextFollowupTime || '',
                priority: task.followupPriority || 'normal'
            }));

            return {
                urgent: urgentFormatted,
                urgentCount: urgentTasks.length,
                thisWeekCount: thisWeekTasks.length,
                totalPipeline: pipelineValue,
                totalLeads: leads.length,
                lastSync: new Date().toISOString(),
                status: 'active'
            };

        } catch (error) {
            console.error('Error extracting LibraLeads data:', error);
            return this.getLibraLeadsEmptyState();
        }
    }

    static getLibraLeadsEmptyState() {
        return {
            urgent: [],
            urgentCount: 0,
            thisWeekCount: 0,
            totalPipeline: 0,
            totalLeads: 0,
            lastSync: new Date().toISOString(),
            status: 'empty'
        };
    }

    // Extract EmailDrafter widget data
    static extractEmailDrafterData() {
        try {
            // Simulate EmailDrafter data (would come from actual tool localStorage)
            const emailData = localStorage.getItem('email-drafter-data') || '{}';
            const data = JSON.parse(emailData);

            return {
                pendingDrafts: data.pendingDrafts || 0,
                savedTimeToday: data.savedTimeToday || '0 hours',
                lastDraft: data.lastDraft || 'No recent drafts',
                aiStatus: data.aiStatus || 'ready',
                lastSync: new Date().toISOString(),
                status: data.pendingDrafts > 0 ? 'active' : 'idle'
            };

        } catch (error) {
            console.error('Error extracting EmailDrafter data:', error);
            return {
                pendingDrafts: 0,
                savedTimeToday: '0 hours',
                lastDraft: 'Error loading data',
                aiStatus: 'error',
                lastSync: new Date().toISOString(),
                status: 'error'
            };
        }
    }

    // Extract Invoice Generator widget data
    static extractInvoiceGeneratorData() {
        try {
            const invoiceData = localStorage.getItem('invoice-generator-data') || '{}';
            const data = JSON.parse(invoiceData);

            const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

            return {
                monthlyRevenue: data.monthlyRevenue || 0,
                pendingInvoices: data.pendingInvoices || 0,
                overdueInvoices: data.overdueInvoices || 0,
                nextInvoice: data.nextInvoice || 'No upcoming invoices',
                lastSync: new Date().toISOString(),
                status: data.pendingInvoices > 0 ? 'pending' : 'current'
            };

        } catch (error) {
            console.error('Error extracting Invoice Generator data:', error);
            return {
                monthlyRevenue: 0,
                pendingInvoices: 0,
                overdueInvoices: 0,
                nextInvoice: 'Error loading data',
                lastSync: new Date().toISOString(),
                status: 'error'
            };
        }
    }

    // Extract data for custom user-added tools
    static extractCustomToolData(toolId, toolName) {
        try {
            // Generic data extraction for custom HTML tools
            const toolData = localStorage.getItem(`tool-${toolId}-data`) || '{}';
            const data = JSON.parse(toolData);

            return {
                toolId: toolId,
                toolName: toolName,
                dataPoints: Object.keys(data).length,
                lastActivity: data.lastActivity || 'No activity',
                status: data.status || 'unknown',
                summary: this.generateToolSummary(data),
                lastSync: new Date().toISOString()
            };

        } catch (error) {
            console.error(`Error extracting custom tool data for ${toolName}:`, error);
            return {
                toolId: toolId,
                toolName: toolName,
                dataPoints: 0,
                lastActivity: 'Error loading data',
                status: 'error',
                summary: 'Unable to load tool data',
                lastSync: new Date().toISOString()
            };
        }
    }

    // Generate summary for custom tools
    static generateToolSummary(data) {
        const keys = Object.keys(data);
        if (keys.length === 0) return 'No data available';

        // Try to find meaningful data points
        const summaryItems = [];

        if (data.count !== undefined) summaryItems.push(`${data.count} items`);
        if (data.total !== undefined) summaryItems.push(`€${data.total} total`);
        if (data.pending !== undefined) summaryItems.push(`${data.pending} pending`);
        if (data.active !== undefined) summaryItems.push(`${data.active} active`);

        return summaryItems.length > 0 ? summaryItems.join(', ') : `${keys.length} data points`;
    }

    // Get all widget data for all tools
    static getAllWidgetData() {
        return {
            libraleads: this.extractLibraLeadsData(),
            emaildrafter: this.extractEmailDrafterData(),
            invoicegenerator: this.extractInvoiceGeneratorData(),
            timestamp: new Date().toISOString()
        };
    }

    // Update widget data (called by native Android code)
    static updateWidgets() {
        const allData = this.getAllWidgetData();

        // Send to native Android widgets
        if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.WidgetData) {
            cordova.plugins.WidgetData.updateAllWidgets(
                JSON.stringify(allData),
                () => console.log('Widgets updated successfully'),
                (error) => console.error('Widget update failed:', error)
            );
        }

        return allData;
    }

    // Schedule periodic widget updates
    static startWidgetUpdates() {
        // Update immediately
        this.updateWidgets();

        // Update every 15 minutes
        setInterval(() => {
            this.updateWidgets();
        }, 15 * 60 * 1000); // 15 minutes

        console.log('Widget data provider started - updates every 15 minutes');
    }
}

// Initialize widget data provider when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // Start widget updates when app is ready
    if (typeof cordova !== 'undefined') {
        document.addEventListener('deviceready', () => {
            WidgetDataProvider.startWidgetUpdates();
        }, false);
    } else {
        // Browser testing - start immediately
        setTimeout(() => {
            WidgetDataProvider.startWidgetUpdates();
        }, 1000);
    }
});

// Make it globally accessible
window.WidgetDataProvider = WidgetDataProvider;