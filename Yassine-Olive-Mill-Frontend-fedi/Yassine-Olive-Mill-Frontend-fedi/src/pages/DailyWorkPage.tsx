import React from 'react';
import { DailyWorkHeader } from '@/components/daily-work/DailyWorkHeader';
import { AddTicketModal } from '@/components/daily-work/AddTicketModal';
import { QRScanModal, CameraScanModal } from '@/components/daily-work/QRScanModal';
import { RecentTicketsSection } from '@/components/daily-work/RecentTicketsSection';
import { MinimizedTicketsBar } from '@/components/daily-work/MinimizedTicketsBar';
import { EditTicketModal } from '@/components/daily-work/EditTicketModal';
import { PrintTicketModal } from '@/components/daily-work/PrintTicketModal';
import { QRDisplayModal } from '@/components/daily-work/QRDisplayModal';
import { TicketDetailsModal } from '@/components/daily-work/TicketDetailsModal';
import { useDailyWork } from '@/hooks/daily-work/useDailyWork';

export function DailyWorkPage() {
  const dailyWork = useDailyWork();

  return (
    <>
      <div className="space-y-8">
        {/* Page Header */}
        <DailyWorkHeader dailyTicketCount={dailyWork.dailyTicketCount} />

        {/* Start Operations - Ticket Creation */}
        <div className="flex justify-center">
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
        </div>

        {/* QR Code Scan for Completion */}
        <div className="flex justify-center">
          <QRScanModal
            isOpen={dailyWork.isQrScanOpen}
            onOpenChange={dailyWork.setIsQrScanOpen}
            onFileUpload={dailyWork.handleQRScan}
            onOpenCamera={() => {
              dailyWork.setIsQrScanOpen(false);
              dailyWork.setIsCameraScanOpen(true);
            }}
          />
        </div>

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
          onDeleteTicket={(ticketId) => {
            // TODO: Implement delete functionality
            console.log('Delete ticket:', ticketId);
          }}
        />
      </div>

      {/* Minimized Tickets Bar */}
      <MinimizedTicketsBar
        minimizedTickets={dailyWork.minimizedTickets}
        onMaximizeTicket={dailyWork.maximizeTicket}
        onRemoveFromMinimized={dailyWork.removeFromMinimized}
      />

      {/* Camera QR Scan Modal */}
      <CameraScanModal
        isOpen={dailyWork.isCameraScanOpen}
        onClose={() => {
          dailyWork.setIsCameraScanOpen(false);
          dailyWork.stopCamera();
        }}
        isCameraActive={dailyWork.isCameraActive}
        videoRef={dailyWork.videoRef}
        onStartCamera={dailyWork.initializeCamera}
        onStopCamera={dailyWork.stopCamera}
      />

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
        onClose={() => dailyWork.setIsEditModalOpen(false)}
        calculateEditNetWeight={dailyWork.calculateEditNetWeight}
        calculateEditTotalAmount={dailyWork.calculateEditTotalAmount}
        isMinimumPriceApplied={dailyWork.isMinimumPriceApplied}
      />

      {/* Print Ticket Modal */}
      <PrintTicketModal
        isOpen={dailyWork.isPrintModalOpen}
        ticket={dailyWork.ticketToPrint}
        onPrint={dailyWork.printTicket}
        onMinimize={dailyWork.minimizeTicket}
        onClose={() => dailyWork.setIsPrintModalOpen(false)}
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
    </>
  );
}
