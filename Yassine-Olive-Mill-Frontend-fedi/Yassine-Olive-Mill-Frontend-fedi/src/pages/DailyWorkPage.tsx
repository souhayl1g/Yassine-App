import React, { useState, useEffect } from 'react';
import { DailyWorkHeader } from '@/components/daily-work/DailyWorkHeader';
import { AddTicketModal } from '@/components/daily-work/AddTicketModal';
import { QRScanModal } from '@/components/daily-work/QRScanModal';
import { RecentTicketsSection } from '@/components/daily-work/RecentTicketsSection';
import { MinimizedTicketsBar } from '@/components/daily-work/MinimizedTicketsBar';
import { EditTicketModal } from '@/components/daily-work/EditTicketModal';
import { PrintTicketModal } from '@/components/daily-work/PrintTicketModal';
import { QRDisplayModal } from '@/components/daily-work/QRDisplayModal';
import { TicketDetailsModal } from '@/components/daily-work/TicketDetailsModal';
import { OperationButtons } from '@/components/daily-work/OperationButtons';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { PaymentHistoryModal } from '@/components/payments/PaymentHistoryModal';
import { useDailyWork } from '@/hooks/daily-work/useDailyWork';
import { usePaymentOperations } from '@/hooks/usePaymentOperations';

export function DailyWorkPage() {
  const dailyWork = useDailyWork();
  const payment = usePaymentOperations();

  // Handle payment completion
  const handlePaymentComplete = () => {
    // Silent refresh to avoid visible reloading/flicker
    dailyWork.loadRecentTickets(dailyWork.currentPage, true);
  };

  return (
    <>
      <div className="space-y-8">
        {/* Page Header */}
        <DailyWorkHeader dailyTicketCount={dailyWork.dailyTicketCount} />

        {/* Operation Buttons - Truck In/Out */}
        <OperationButtons
          onStartOperation={() => dailyWork.setIsAddTicketOpen(true)}
          onFinishOperation={() => {
            dailyWork.setIsFinishingOperation(true);
            dailyWork.setIsQrScanOpen(true);
          }}
        />

        {/* Recent Tickets Section */}
        <RecentTicketsSection
          recentTickets={dailyWork.recentTickets}
          loadingTickets={dailyWork.loadingTickets}
          totalTickets={dailyWork.totalTickets}
          totalPages={dailyWork.totalPages}
          currentPage={dailyWork.currentPage}
          onTicketClick={dailyWork.handleTicketClick}
          onPrintTicket={dailyWork.handlePrintTicket}
          onShowQrCode={dailyWork.handleShowQrCode}
          onPageChange={(page) => dailyWork.loadRecentTickets(page, true)}
          onDeleteTicket={dailyWork.handleDeleteTicket}
          onPayTicket={payment.openPaymentModal}
          onViewPaymentHistory={(clientId, clientName) => payment.openPaymentHistory(clientId, clientName)}
          getPaymentStatus={dailyWork.getTicketPaymentStatus}
        />
      </div>

      {/* Minimized Tickets Bar */}
      <MinimizedTicketsBar
        minimizedTickets={dailyWork.minimizedTickets}
        onMaximizeTicket={dailyWork.maximizeTicket}
        onRemoveFromMinimized={dailyWork.removeFromMinimized}
      />

      {/* Camera scan is now a tab inside QRScanModal */}

      {/* Edit Ticket Modal */}
      <EditTicketModal
        isOpen={dailyWork.isEditModalOpen}
        ticket={dailyWork.scannedTicket}
        editForm={dailyWork.editForm}
        setEditForm={dailyWork.setEditForm}
        currentPrices={dailyWork.currentPrices}
        loadingPrices={dailyWork.loadingPrices}
        isSaving={dailyWork.isSaving}
        onSave={dailyWork.handleSaveChanges}
        onMinimize={dailyWork.minimizeTicket}
        onShowDetails={(ticket) => {
          dailyWork.setIsDetailsModalOpen(true);
          dailyWork.loadPressingHistory(ticket.id);
        }}
        onClose={() => {
          dailyWork.setIsEditModalOpen(false);
          dailyWork.setIsFinishingOperation(false);
        }}
        calculateEditNetWeight={dailyWork.calculateEditNetWeight}
        calculateEditTotalAmount={dailyWork.calculateEditTotalAmount}
        calculateEditTotalAmountWithDetails={dailyWork.calculateEditTotalAmountWithDetails}
        isMinimumPriceApplied={dailyWork.isMinimumPriceApplied}
        isFinishingOperation={dailyWork.isFinishingOperation}
      />

      {/* Print Ticket Modal */}
      <PrintTicketModal
        isOpen={dailyWork.isPrintModalOpen}
        ticket={dailyWork.ticketToPrint}
        onPrint={dailyWork.printTicket}
        onMinimize={dailyWork.minimizeTicket}
        onClose={() => dailyWork.setIsPrintModalOpen(false)}
        onOpenQuitWindow={dailyWork.handleOpenQuitWindow}
      />

      {/* QR Display Modal */}
      <QRDisplayModal
        isOpen={dailyWork.isQrDisplayOpen}
        qrCodeImage={dailyWork.qrCodeImage}
        onClose={() => dailyWork.setIsQrDisplayOpen(false)}
      />

      {/* Ticket Details Modal */}
      <TicketDetailsModal
        isOpen={dailyWork.isDetailsModalOpen}
        ticket={dailyWork.scannedTicket}
        pressingHistory={dailyWork.pressingHistory}
        loadingPressingHistory={dailyWork.loadingPressingHistory}
        currentPrices={dailyWork.currentPrices}
        onClose={() => dailyWork.setIsDetailsModalOpen(false)}
        onPrint={(ticket) => {
          dailyWork.setIsDetailsModalOpen(false);
          dailyWork.setTicketToPrint(ticket);
          dailyWork.setIsPrintModalOpen(true);
        }}
        onShowQR={(ticket) => {
          dailyWork.setIsDetailsModalOpen(false);
          dailyWork.setQrCodeImage(ticket.qrCode!);
          dailyWork.setIsQrDisplayOpen(true);
        }}
      />

      {/* Hidden Modals - Controlled by Operation Buttons */}
      <AddTicketModal
        isOpen={dailyWork.isAddTicketOpen}
        onOpenChange={dailyWork.setIsAddTicketOpen}
        newTicket={dailyWork.newTicket}
        setNewTicket={dailyWork.setNewTicket}
        searchResults={dailyWork.searchResults}
        selectedClient={dailyWork.selectedClient}
        setSelectedClient={dailyWork.setSelectedClient}
        onAddTicket={dailyWork.handleAddTicket}
        onCancel={dailyWork.handleCancelAddTicket}
      />

      <QRScanModal
        isOpen={dailyWork.isQrScanOpen}
        onOpenChange={(open) => {
          dailyWork.setIsQrScanOpen(open);
          if (!open) {
            dailyWork.setIsFinishingOperation(false);
            dailyWork.stopCamera();
          }
        }}
        onFileUpload={dailyWork.handleQRScan}
        onDeviceScan={(qrData) => {
          // Handle device scan - create a fake file to reuse existing handleQRScan logic
          const fakeFile = new File([qrData], 'qr-scan.txt', { type: 'text/plain' });
          // For device scan, we need to directly process the QR data
          dailyWork.handleQRResult(qrData);
        }}
        isCameraActive={dailyWork.isCameraActive}
        videoRef={dailyWork.videoRef}
        onStartCamera={dailyWork.initializeCamera}
        onStopCamera={dailyWork.stopCamera}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={payment.isPaymentModalOpen}
        onClose={payment.closePaymentModal}
        ticket={payment.selectedTicket}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Payment History Modal */}
      <PaymentHistoryModal
        isOpen={payment.isPaymentHistoryOpen}
        onClose={payment.closePaymentHistory}
        clientId={payment.selectedClientId}
        clientName={payment.selectedClientName}
      />
    </>
  );
}
