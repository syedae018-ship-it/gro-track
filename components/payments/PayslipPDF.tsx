import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register fonts if needed, else stick to defaults
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    borderBottom: '1 solid #eaeaea',
    paddingBottom: 20
  },
  companyDetails: {
    alignItems: 'flex-end',
  },
  logo: {
    width: 60,
    height: 60,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    marginBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 5
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3
  },
  subtitle: {
    color: '#666',
    marginBottom: 2
  },
  section: {
    marginBottom: 30
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottom: '1 solid #eaeaea',
    paddingBottom: 5
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  bold: {
    fontWeight: 'bold'
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1 solid #eaeaea',
    paddingBottom: 5,
    marginBottom: 5,
    fontWeight: 'bold'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #fafafa',
    paddingVertical: 5
  },
  col1: { width: '40%' },
  col2: { width: '20%' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  totalSection: {
    marginTop: 20,
    borderTop: '2 solid #111',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  totalRow: {
    flexDirection: 'row',
    width: '40%',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold'
  }
});

interface PayslipProps {
  employee: {
    name: string;
    id: string;
    role: string;
  };
  payPeriod: {
    start: string;
    end: string;
  };
  tasks: Array<{
    title: string;
    payType: string;
    rate: number;
    hours: number;
    amount: number;
  }>;
  totalEarnings: number;
}

export const PayslipPDF = ({ employee, payPeriod, tasks, totalEarnings }: PayslipProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>PAYSLIP</Text>
          <Text style={styles.subtitle}>Pay Period: {payPeriod.start} - {payPeriod.end}</Text>
          <Text style={styles.subtitle}>Date: {new Date().toLocaleDateString('en-IN')}</Text>
        </View>
        <View style={styles.companyDetails}>
          {/* Mock Logo using a styled view or text */}
          <Text style={styles.companyName}>GroTrack Inc.</Text>
          <Text style={styles.subtitle}>123 Business Avenue</Text>
          <Text style={styles.subtitle}>Tech Hub, IN 400001</Text>
        </View>
      </View>

      {/* Employee Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EMPLOYEE DETAILS</Text>
        <View style={styles.row}>
          <Text>Name:</Text>
          <Text style={styles.bold}>{employee.name}</Text>
        </View>
        <View style={styles.row}>
          <Text>Employee ID:</Text>
          <Text style={styles.bold}>{employee.id}</Text>
        </View>
        <View style={styles.row}>
          <Text>Role:</Text>
          <Text style={styles.bold}>{employee.role}</Text>
        </View>
      </View>

      {/* Earnings Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EARNINGS BREAKDOWN</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Description</Text>
            <Text style={styles.col2}>Type</Text>
            <Text style={styles.col3}>Rate/Hours</Text>
            <Text style={styles.col4}>Amount (INR)</Text>
          </View>
          
          {tasks.map((t, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.col1}>{t.title}</Text>
              <Text style={styles.col2}>{t.payType === 'hourly' ? 'Hourly' : 'Fixed'}</Text>
              <Text style={styles.col3}>
                {t.payType === 'hourly' ? `${t.rate} x ${t.hours}h` : `${t.rate}`}
              </Text>
              <Text style={styles.col4}>{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Total */}
      <View style={styles.totalSection}>
        <View style={{ width: '100%', alignItems: 'flex-end' }}>
          <View style={styles.totalRow}>
            <Text style={styles.bold}>Total Earnings:</Text>
            <Text style={styles.totalAmount}>₹ {totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);
