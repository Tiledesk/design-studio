import { Component, Input, OnInit } from '@angular/core';
import { NotifyService } from 'src/app/services/notify.service';
import { FaqService } from 'src/app/services/faq.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { downloadObjectAsJson } from 'src/app/utils/util';

@Component({
  selector: 'cds-detail-import-export',
  templateUrl: './import-export.component.html',
  styleUrls: ['./import-export.component.scss']
})
export class CDSDetailImportExportComponent implements OnInit {

  @Input() id_faq_kb: string;
  @Input() faqKb_name: string;
  @Input() translationsMap: Map<string, string> = new Map();
  
  displayInfoModal = 'none';
  displayImportJSONModal = 'none';
  displayDeleteFaqModal = 'none';

  SHOW_CIRCULAR_SPINNER = false;

  csvColumnsDelimiter = ';'
  parse_done: boolean;
  parse_err: boolean;
  modalChoosefileDisabled: boolean;

  logger: LoggerService = LoggerInstance.getInstance();
  constructor(
    private notify: NotifyService,
    private faqService: FaqService,
  ) { }

  ngOnInit(): void {
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
        downloadObjectAsJson(faq, faq.name);
      }
    }, (error) => {
      this.logger.error('[TILEBOT] - EXPORT BOT TO JSON - ERROR', error);
    }, () => {
      this.logger.log('[TILEBOT] - EXPORT BOT TO JSON - COMPLETE');
    });
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

      this.notify.showWidgetStyleUpdateNotification(this.translationsMap.get('CDSSetting.ThereHasBeenAnErrorProcessing'), 4, 'report_problem');
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

      this.notify.showWidgetStyleUpdateNotification(this.translationsMap.get('CDSSetting.ThereHasBeenAnErrorProcessing'), 4, 'report_problem');
    }, () => {
      this.logger.log('[TILEBOT] - IMPORT INTENTS FROM JSON - * COMPLETE *');
      this.notify.showWidgetStyleUpdateNotification(this.translationsMap.get('CDSSetting.FileUploadedSuccessfully'), 2, 'done');

      this.onCloseImportJSONModal();
      
    });
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
