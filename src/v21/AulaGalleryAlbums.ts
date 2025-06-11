import { AlbumMedia, } from './AulaAlbumMedia';
import { AulaJsonResponseDataWrapper } from './AulaCommon';
import { AulaGroup } from './AulaPosts';
import { ProfilePicture } from './AulaProfilePicture';



export class AlbumCreator {
    profileId: number;
    id: number;
    institutionCode: string;
    institutionName: string;
    role: string;
    name: string;
    profilePicture: ProfilePicture | null;
    mainGroup: string | null;
    shortName: string;
    institutionRole: string;
    metadata: string;
}

export class GalleryAlbum {
    id: number | null;
    title: string;
    description: string;
    creator: AlbumCreator | null;
    creationDate: string;
    sharedWithGroups: AulaGroup[];
    thumbnailsUrls: string[];
    regardingInstitutionProfileId: number | null;
    currentUserCanEdit: boolean;
    currentUserCanDelete: boolean;
    currentUserCanAddMedia: boolean;

    IsDefaultMyChildAlbum: boolean = false;

    Media : AlbumMedia[] = [];

    public HasImages() : boolean {
        return (this.Media && this.Media.length > 0)
    }

    public GetImages() : AlbumMedia[] {
        if (!this.Media) return [];
        if (this.Media.length === 0) return [];

        return this.Media;
    }

    public GetImagetUrls() : string[] {
        let images = this.GetImages();
        return images.map(image => image.GetFullSizeUrl());
    }

}

export class AulaGalleryAlbumsResponse extends AulaJsonResponseDataWrapper<GalleryAlbum[]> {

}

// Serialization helper
export class AulaGalleryAlbumsSerializer {

    static fromJSON(json: string): GalleryAlbum[] {
        const response = JSON.parse(json);
        const responseObj = Object.assign(new AulaGalleryAlbumsResponse(), response);

        responseObj.data = responseObj.data.map((album : GalleryAlbum) => {
            album = Object.assign(new GalleryAlbum(), album) as GalleryAlbum;
            if (!album || album.id === null || album.id === 0 || album.id === -1)
                album.IsDefaultMyChildAlbum = true;

            album.Media = album.Media.map((media : AlbumMedia) => Object.assign(new AlbumMedia(), media) as AlbumMedia);
            return album;
        });
        
        return responseObj.data;
    }

}
