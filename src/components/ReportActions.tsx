'use client'

import { RefObject, useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

type ReportActionsProps = {
  contentRef: RefObject<HTMLDivElement | null>
  filename?: string
}

export default function ReportActions({ contentRef, filename = 'report' }: ReportActionsProps) {
  const [exporting, setExporting] = useState(false)

  const handleExportPDF = async () => {
    if (!contentRef.current || exporting) return
    setExporting(true)

    try {
      const element = contentRef.current

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = canvas.width
      const imgHeight = canvas.height

      // A4 dimensions in mm
      const pdfWidth = 297 // landscape width
      const pdfHeight = 210 // landscape height
      const pdfWidthPx = pdfWidth * (96 / 25.4) // convert mm to px at 96dpi

      const ratio = pdfWidthPx / imgWidth
      const scaledHeight = imgHeight * ratio
      const pdfHeightMm = (scaledHeight / (96 / 25.4))

      // Use landscape orientation for wide tables
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      // If content fits in one page
      if (pdfHeightMm <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeightMm)
      } else {
        // Multi-page: slice the canvas
        const pageHeightPx = pdfHeight / ratio
        let yOffset = 0
        let page = 0

        while (yOffset < imgHeight) {
          if (page > 0) pdf.addPage()

          const sliceHeight = Math.min(pageHeightPx, imgHeight - yOffset)

          const pageCanvas = document.createElement('canvas')
          pageCanvas.width = imgWidth
          pageCanvas.height = sliceHeight
          const ctx = pageCanvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(canvas, 0, yOffset, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight)
            const pageImgData = pageCanvas.toDataURL('image/png')
            const sliceHeightMm = sliceHeight * ratio / (96 / 25.4)
            pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, sliceHeightMm)
          }

          yOffset += pageHeightPx
          page++
        }
      }

      pdf.save(`${filename}.pdf`)
    } catch (error) {
      console.error('PDF export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex gap-2 print:hidden">
      <button
        onClick={handleExportPDF}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {exporting ? 'جاري التصدير...' : 'تصدير PDF'}
      </button>

      <button
        onClick={handlePrint}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        طباعة
      </button>
    </div>
  )
}
