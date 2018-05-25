from tethys_sdk.base import TethysAppBase, url_map_maker


class FloodExtentApp(TethysAppBase):
    """
    Tethys app class for Flood Extent App.
    """

    name = 'Flood Extent App'
    index = 'flood_extent_app:home'
    icon = 'flood_extent_app/images/icon.gif'
    package = 'flood_extent_app'
    root_url = 'flood-extent-app'
    color = '#49639a'
    description = 'Place a brief description of your app here.'
    tags = ''
    enable_feedback = False
    feedback_emails = []

    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (
            UrlMap(
                name='home',
                url='flood-extent-app',
                controller='flood_extent_app.controllers.home'
            ),
            UrlMap(
                name='createnetcdf',
                url='flood-extent-app/createnetcdf',
                controller='flood_extent_app.ajax_controllers.createnetcdf'
            ),
            UrlMap(
                name='createnetcdf',
                url='flood-extent-app/displaygeojson',
                controller='flood_extent_app.ajax_controllers.displaygeojson'
            ),
        )

        return url_maps
