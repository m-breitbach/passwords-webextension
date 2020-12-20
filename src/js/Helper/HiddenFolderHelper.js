import ServerRepository from "@js/Repositories/ServerRepository";
import ErrorManager from "@js/Manager/ErrorManager";
import NotFoundError from "passwords-client/src/Exception/Http/NotFoundError";
import SettingsService from "@js/Services/SettingsService";

export default class HiddenFolderHelper {

    /**
     * @param {Api} api
     * @returns {Promise<String>}
     */
    async getHiddenFolderId(api) {
        let folder = await this.getHiddenFolder(api);

        return folder.getId();
    }

    /**
     *
     * @param {Api} api
     * @returns {Promise<EnhancedFolder>}
     */
    async getHiddenFolder(api) {
        let folderId = await this._getFolderId(api);

        if(folderId === null) {
            return await this._createHiddenFolder(api);
        }

        return await this._loadHiddenFolder(api, folderId);
    }

    /**
     *
     * @param {Api} api
     * @returns {Promise<(String|null)>}
     * @private
     */
    async _getFolderId(api) {
        let server   = api.getServer(),
            folderId = server.getPrivateFolder();

        if(folderId) return folderId;

        let folderSetting = await SettingsService.getValue('password.folder.private');
        if(folderSetting !== null) {
            server.setPrivateFolder(folderSetting);
            ServerRepository
                .update(server)
                .catch(ErrorManager.catch);

            return folderSetting;
        }

        return null;
    }

    /**
     *
     * @param {Api} api
     * @returns {Promise<(EnhancedFolder|Folder)>}
     * @private
     */
    async _createHiddenFolder(api) {
        let server = api.getServer(),
            folder = api
                .getClass('model.folder')
                .setLabel('BrowserExtensionPrivateFolder')
                .setHidden(true);

        await api.getFolderRepository().create(folder);

        server.setPrivateFolder(folder.getId());
        ServerRepository
            .update(server)
            .catch(ErrorManager.catch);

        SettingsService
            .set('password.folder.private', folder.getId())
            .catch(ErrorManager.catchEvt);

        return folder;
    }

    /**
     *
     * @param {Api} api
     * @param {String} folderId
     * @returns {Promise<EnhancedFolder>}
     * @private
     */
    async _loadHiddenFolder(api, folderId) {
        try {
            return await api.getFolderRepository().findById(folderId, 'model+passwords');
        } catch(e) {
            if(e instanceof NotFoundError) {
                return await this._createHiddenFolder(api);
            }
            throw e;
        }
    }
}