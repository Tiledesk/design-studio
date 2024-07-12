import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { NetworkService } from 'src/app/services/network.service';

@Component({
  selector: 'cds-network-offline',
  templateUrl: './network-offline.component.html',
  styleUrls: ['./network-offline.component.scss']
})
export class NetworkOfflineComponent implements OnInit {

  constructor(
    public dialogRef: MatDialogRef<NetworkOfflineComponent>,
    private networkService: NetworkService
  ) { }

  ngOnInit(): void {
    this.networkService.networkStatus$.subscribe((isOnline)=> {
      if(isOnline){
        this.dialogRef.close()
      }
    })
  }

}
