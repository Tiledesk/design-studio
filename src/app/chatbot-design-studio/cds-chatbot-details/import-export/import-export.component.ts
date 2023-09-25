import { Component, Input, OnInit } from '@angular/core';
import { NotifyService } from 'app/core/notify.service';
import { FaqService } from 'app/services/faq.service';
import { LoggerService } from 'app/services/logger/logger.service';

@Component({
  selector: 'cds-detail-import-export',
  templateUrl: './import-export.component.html',
  styleUrls: ['./import-export.component.scss']
})
export class CDSDetailImportExportComponent implements OnInit {

  @Input() id_faq_kb: string;
  @Input() faqKb_name: string;
  
  displayImportModal = 'none';
  displayInfoModal = 'none';
  displayImportJSONModal = 'none';
  displayDeleteFaqModal = 'none';

  SHOW_CIRCULAR_SPINNER = false;

  csvColumnsDelimiter = ';'
  parse_done: boolean;
  parse_err: boolean;
  modalChoosefileDisabled: boolean;

  constructor(
    private logger: LoggerService,
    private notify: NotifyService,
    private faqService: FaqService,
  ) { }

  ngOnInit(): void {
  }


  openImportModal() {
    this.displayImportModal = 'block';
  }


  // -------------------------------------------------------------------------------------- 
  // Export chatbot to JSON
  // -------------------------------------------------------------------------------------- 
  exportChatbotToJSON() {
    // const exportFaqToJsonBtnEl = <HTMLElement>document.querySelector('.export-chatbot-to-json-btn');
    // exportFaqToJsonBtnEl.blur();
    this.faqService.exportChatbotToJSON(this.id_faq_kb).subscribe((faq: any) => {
      // this.logger.log('[TILEBOT] - EXPORT CHATBOT TO JSON - FAQS', faq)
      // this.logger.log('[TILEBOT] - EXPORT FAQ TO JSON - FAQS INTENTS', faq.intents)
      if (faq) {
        this.downloadObjectAsJson(faq, faq.name);
      }
    }, (error) => {
      this.logger.error('[TILEBOT] - EXPORT BOT TO JSON - ERROR', error);
    }, () => {
      this.logger.log('[TILEBOT] - EXPORT BOT TO JSON - COMPLETE');
    });
  }


  // -------------------------------------------------------------------------------------- 
  // Export intents to JSON
  // -------------------------------------------------------------------------------------- 
  exportIntentsToJSON() {
    const exportFaqToJsonBtnEl = <HTMLElement>document.querySelector('.export-intents-to-json-btn');
    exportFaqToJsonBtnEl.blur();
    this.faqService.exportIntentsToJSON(this.id_faq_kb).subscribe((faq: any) => {
      // this.logger.log('[TILEBOT] - EXPORT BOT TO JSON - FAQS', faq)
      // this.logger.log('[TILEBOT] - EXPORT FAQ TO JSON - FAQS INTENTS', faq.intents)
      if (faq) {
        this.downloadObjectAsJson(faq, this.faqKb_name + ' intents');
      }
    }, (error) => {
      this.logger.error('[TILEBOT] - EXPORT BOT TO JSON - ERROR', error);
    }, () => {
      this.logger.log('[TILEBOT] - EXPORT BOT TO JSON - COMPLETE');

    });
  }


  downloadObjectAsJson(exportObj, exportName) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }


   // --------------------------------------------------------------------------
  // @ Import chatbot from json ! NOT USED
  // --------------------------------------------------------------------------
  fileChangeUploadChatbotFromJSON(event) {

    this.logger.log('[TILEBOT] - fileChangeUploadChatbotFromJSON $event ', event);
    let fileJsonToUpload = ''
    // this.logger.log('[TILEBOT] - fileChangeUploadChatbotFromJSON $event  target', event.target);
    const selectedFile = event.target.files[0];
    const fileReader = new FileReader();
    fileReader.readAsText(selectedFile, "UTF-8");
    fileReader.onload = () => {
      fileJsonToUpload = JSON.parse(fileReader.result as string)
      this.logger.log('fileJsonToUpload CHATBOT', fileJsonToUpload);
    }
    fileReader.onerror = (error) => {
      this.logger.log(error);
    }

    this.faqService.importChatbotFromJSON(this.id_faq_kb, fileJsonToUpload).subscribe((res: any) => {
      this.logger.log('[TILEBOT] - IMPORT CHATBOT FROM JSON - ', res)

    }, (error) => {
      this.logger.error('[TILEBOT] -  IMPORT CHATBOT FROM JSON- ERROR', error);

      this.notify.showWidgetStyleUpdateNotification("thereHasBeenAnErrorProcessing", 4, 'report_problem');
    }, () => {
      this.logger.log('[TILEBOT] - IMPORT CHATBOT FROM JSON - COMPLETE');
    });
  }


  // --------------------------------------------------------------------------
  // @ Import Itents from JSON
  // --------------------------------------------------------------------------
  presentModalImportIntentsFromJson() {
    this.displayImportJSONModal = "block"
  }

  onCloseImportJSONModal() {
    this.displayImportJSONModal = "none"
  }

  fileChangeUploadIntentsFromJSON(event, action) {
    // this.logger.log('[TILEBOT] - fileChangeUploadJSON event ', event);
    // this.logger.log('[TILEBOT] - fileChangeUploadJSON action ', action);
    const fileList: FileList = event.target.files;
    const file: File = fileList[0];
    const formData: FormData = new FormData();
    formData.set('id_faq_kb', this.id_faq_kb);
    formData.append('uploadFile', file, file.name);
    this.logger.log('FORM DATA ', formData)

    this.faqService.importIntentsFromJSON(this.id_faq_kb, formData ,action).subscribe((res: any) => {
      this.logger.log('[TILEBOT] - IMPORT INTENTS FROM JSON - ', res)

    }, (error) => {
      this.logger.error('[TILEBOT] -  IMPORT INTENTS FROM JSON- ERROR', error);

      this.notify.showWidgetStyleUpdateNotification("thereHasBeenAnErrorProcessing", 4, 'report_problem');
    }, () => {
      this.logger.log('[TILEBOT] - IMPORT INTENTS FROM JSON - * COMPLETE *');
      this.notify.showWidgetStyleUpdateNotification("File was uploaded succesfully", 2, 'done');

      this.onCloseImportJSONModal();
      
    });
  }

  // UPLOAD FAQ FROM CSV
  fileChangeUploadCSV(event) {
    this.displayImportModal = 'none';
    this.displayInfoModal = 'block';

    this.SHOW_CIRCULAR_SPINNER = true;

    this.logger.log('[CDS-CHATBOT-DTLS] CSV COLUMNS DELIMITER ', this.csvColumnsDelimiter)
    const fileList: FileList = event.target.files;
    if (fileList.length > 0) {
      const file: File = fileList[0];
      const formData: FormData = new FormData();
      formData.set('id_faq_kb', this.id_faq_kb);
      formData.set('delimiter', this.csvColumnsDelimiter);
      formData.append('uploadFile', file, file.name);
      this.logger.log('FORM DATA ', formData)

      this.faqService.uploadFaqCsv(formData)
        .subscribe(data => {
          this.logger.log('[CDS-CHATBOT-DTLS] UPLOAD CSV DATA ', data);
          if (data['success'] === true) {
            this.parse_done = true;
            this.parse_err = false;
          } else if (data['success'] === false) {
            this.parse_done = false;
            this.parse_err = true;
          }
        }, (error) => {
          this.logger.error('[CDS-CHATBOT-DTLS] UPLOAD CSV - ERROR ', error);
          this.SHOW_CIRCULAR_SPINNER = false;
        }, () => {
          this.logger.log('[CDS-CHATBOT-DTLS] UPLOAD CSV * COMPLETE *');
          setTimeout(() => {
            this.SHOW_CIRCULAR_SPINNER = false
          }, 300);
        });

    }
  }


  countDelimiterDigit(event) {
    this.logger.log('[CDS-CHATBOT-DTLS] # OF DIGIT ', this.csvColumnsDelimiter.length)
    if (this.csvColumnsDelimiter.length !== 1) {
      (<HTMLInputElement>document.getElementById('file')).disabled = true;
      this.modalChoosefileDisabled = true;
    } else {
      (<HTMLInputElement>document.getElementById('file')).disabled = false;
      this.modalChoosefileDisabled = false;
    }
  }

  exportFaqsToCsv() {
    this.faqService.exsportFaqsToCsv(this.id_faq_kb).subscribe((faq: any) => {
      this.logger.log('[CDS-CHATBOT-DTLS] - EXPORT FAQ TO CSV - FAQS', faq)

      if (faq) {
        this.downloadFile(faq, 'faqs.csv');
      }
    }, (error) => {
      this.logger.error('[CDS-CHATBOT-DTLS] - EXPORT FAQ TO CSV - ERROR', error);
    }, () => {
      this.logger.log('[CDS-CHATBOT-DTLS] - EXPORT FAQ TO CSV - COMPLETE');
    });
  }

  downloadExampleCsv() {
    // const examplecsv = 'Question; Answer; intent_id (must be unique); intent_display_name; webhook_enabled (must be false)'
    const examplecsv = 'Where is standard shipping available?;Standard shipping is only available to the contiguous US, excluding Alaska, Hawaii, and all US territories. If you are shipping to any of these excluded regions, you are ineligible for standard shipping\nHow is software delivered?;Unless otherwise stated, Software shall be delivered digitally. Instructions for download orders will be sent via email\nWhen will my backorder ship?;Although we try to maintain inventory of all products in the warehouse, occasionally an item will be backordered. Normally, the product will become available in a week. You will receive an email notification as soon as the product ships. As a reminder, your credit card will not be charged until your order has been shipped. If you use a third-party payment or billing provider (e.g., PayPal), you may be charged before your order ships pursuant to their terms and conditions\nCan I change my shipping address?;Unfortunately, you cannot change your shipping address after your order has been submitted. The order is immediately sent to the fulfilment agency and can no longer be changed by our system. If your package is not successfully delivered, it will be returned to the warehouse and a credit will be made to your account\nCan I change my shipping method?;Unfortunately, you cannot change your shipment method after your order has been submitted. The order is immediately sent to the fulfilment agency and can no longer be changed by our system\nShipping notification;Shipment confirmation emails with tracking numbers are sent the business day after your order ships\nDelivery costs;Delivery costs are calculated and displayed after you have entered your shipping information on the checkout page\nDo you ship to P.O. Boxes?;Due to shipping restrictions, we cannot deliver to P.O. Boxes\nWhen is your shipping cut off time?;Orders placed for in-stock items before 10am PST (Pacific Standard Time), Monday through Friday will usually ship within one business day. We do not offer Saturday, Sunday, or holiday shipping or deliveries. Please note that we may have to verify your billing information. Any incomplete or incorrect information may result in processing delays or cancellations\n'
    this.downloadFile(examplecsv, 'example.csv');
  }


  downloadFile(data, filename) {
    const blob = new Blob(['\ufeff' + data], { type: 'text/csv;charset=utf-8;' });
    const dwldLink = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const isSafariBrowser = navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1;
    this.logger.log('[CDS-CHATBOT-DTLS] isSafariBrowser ', isSafariBrowser)
    if (isSafariBrowser) {  // if Safari open in new window to save file with random filename.
      dwldLink.setAttribute('target', '_blank');

      /**
       * *** FOR SAFARI TO UNCOMMENT AND TEST ***
       */
      // https://stackoverflow.com/questions/29799696/saving-csv-file-using-blob-in-safari/46641236
      // const link = document.createElement('a');
      // link.id = 'csvDwnLink';

      // document.body.appendChild(link);
      // window.URL = window.URL;
      // const csv = '\ufeff' + data,
      //   csvData = 'data:attachment/csv;charset=utf-8,' + encodeURIComponent(csv),
      //   filename = 'filename.csv';
      // $('#csvDwnLink').attr({ 'download': filename, 'href': csvData });
      // $('#csvDwnLink')[0].click();
      // document.body.removeChild(link);
    }
    dwldLink.setAttribute('href', url);
    dwldLink.setAttribute('download', filename);
    dwldLink.style.visibility = 'hidden';
    document.body.appendChild(dwldLink);
    dwldLink.click();
    document.body.removeChild(dwldLink);
  }


  
  // CLOSE MODAL WITHOUT SAVE THE UPDATES OR WITHOUT CONFIRM THE DELETION
  onCloseModal() {
    this.displayDeleteFaqModal = 'none';
    this.displayInfoModal = 'none';
    this.displayImportModal = 'none';
  }

  onCloseInfoModalHandledError() {
    this.logger.log('[CDS-CHATBOT-DTLS] onCloseInfoModalHandledError')
    this.displayInfoModal = 'none';
    // this.router.navigate(['project/' + this.project._id + '/faqkb']);
    // this.ngOnInit();
  }

  onCloseInfoModalHandledSuccess() {
    this.displayInfoModal = 'none';
  }

}
