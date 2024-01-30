import { BrandService } from "../services/brand.service";
import { SHARE_MENU_ITEMS } from "./utils-menu";

export class BrandResources {
    
    brand: {}
    
    contructor(
        brandService: BrandService
    ) {
        this.brand = brandService.getBrand()['CDS']
    }

    loadResources(){
        if(!this.brand){
            return;
        }

        SHARE_MENU_ITEMS.find(el => el.key === 'FEEDBACK').src =  this.brand['menuItems']['FEEDBACK'].src 

    }
}

// exports { TiledeskVarSplitter };
