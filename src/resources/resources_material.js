pc.extend(pc, function () {
    'use strict';

    var PARAMETER_TYPES = {
        ambient: 'vec3',
        ambientTnumber: 'boolean',
        aoMap: 'texture',
        aoMapVertexColor: 'boolean',
        aoMapChannel: 'string',
        aoMapUv: 'number',
        aoMapTiling: 'vec2',
        aoMapOffset: 'vec2',
        occludeSpecular: 'boolean',
        diffuse: 'vec3',
        diffuseMap: 'texture',
        diffuseMapVertexColor: 'boolean',
        diffuseMapChannel: 'string',
        diffuseMapUv: 'number',
        diffuseMapTiling: 'vec2',
        diffuseMapOffset: 'vec2',
        diffuseMapTnumber: 'boolean',
        specular: 'vec3',
        specularMapVertexColor: 'boolean',
        specularMapChannel: 'string',
        specularMapUv: 'number',
        specularMap: 'texture',
        specularMapTiling: 'vec2',
        specularMapOffset: 'vec2',
        specularMapTnumber: 'boolean',
        specularAntialias: 'boolean',
        useMetalness: 'boolean',
        metalnessMap: 'texture',
        metalnessMapVertexColor: 'boolean',
        metalnessMapChannel: 'string',
        metalnessMapUv: 'number',
        metalnessMapTiling: 'vec2',
        metalnessMapOffset: 'vec2',
        metalnessMapTnumber: 'boolean',
        metalness: 'number',
        conserveEnergy: 'boolean',
        shininess: 'number',
        glossMap: 'texture',
        glossMapVertexColor: 'boolean',
        glossMapChannel: 'string',
        glossMapUv: 'number',
        glossMapTiling: 'vec2',
        glossMapOffset: 'vec2',
        fresnelModel: 'number',
        fresnelFactor: 'float',
        emissive: 'vec3',
        emissiveMap: 'texture',
        emissiveMapVertexColor: 'boolean',
        emissiveMapChannel: 'string',
        emissiveMapUv: 'number',
        emissiveMapTiling: 'vec2',
        emissiveMapOffset: 'vec2' ,
        emissiveMapTint: 'boolean',
        emissiveIntensity: 'number',
        normalMap: 'texture',
        normalMapTiling: 'vec2',
        normalMapOffset: 'vec2',
        normalMapUv: 'number',
        bumpMapFactor: 'number',
        heightMap: 'texture',
        heightMapChannel: 'string',
        heightMapUv: 'number',
        heightMapTiling: 'vec2',
        heightMapOffset: 'vec2',
        heightMapFactor: 'number',
        alphaTest: 'number',
        opacity: 'number',
        opacityMap: 'texture',
        opacityMapVertexColor: 'boolean',
        opacityMapChannel: 'string',
        opacityMapUv: 'number',
        opacityMapTiling: 'vec2',
        opacityMapOffset: 'vec2',
        reflectivity: 'number',
        refraction: 'number',
        refractionIndex: 'number',
        sphereMap: 'texture',
        cubeMap: 'cubemap',
        cubeMapProjection: 'boolean',
        lightMap: 'texture',
        lightMapVertexColor: 'boolean',
        lightMapChannel: 'string',
        lightMapUv: 'number',
        lightMapTiling: 'vec2',
        lightMapOffset: 'vec2',
        depthTest: 'boolean' ,
        depthWrite: 'boolean',
        cull: 'number',
        blendType: 'number',
        shadowSampleType: 'number',
        shadingModel: 'number'
    };

    var onTextureAssetChanged = function (asset, attribute, newValue, oldValue) {
        if (attribute !== 'resource') {
            return;
        }

        var material = this;
        var dirty = false;

        if (oldValue) {
            for (var key in material) {
                if (material.hasOwnProperty(key)) {
                    if (material[key] === oldValue) {
                        material[key] = newValue;
                        dirty = true;
                    }
                }
            }
        }

        if (dirty) {
            material.update();
        } else {
            asset.off('change', onTextureAssetChanged, material);
        }
    };

    var onCubemapAssetChanged = function (asset, attribute, newValue, oldValue) {
        if (attribute !== 'resources') {
            return;
        }

        var material = this;
        var dirty = false;

        var props = [
            'cubeMap',
            'prefilteredCubeMap128',
            'prefilteredCubeMap64',
            'prefilteredCubeMap32',
            'prefilteredCubeMap16',
            'prefilteredCubeMap8',
            'prefilteredCubeMap4'
        ];

        if (!newValue)
            newValue = [];

        if (!oldValue)
            oldValue = [];

        for (var i = 0; i < props.length; i++) {
            if (material[props[i]] === oldValue[i]) {
                material[props[i]] = newValue[i];
                dirty = true;
            }
        }

        if (dirty) {
            material.update();
        } else {
            asset.off('change', onCubemapAssetChanged, material);
        }
    };

    var MaterialHandler = function (assets) {
        this._assets = assets;
    };

    MaterialHandler.prototype = {
        load: function (url, callback) {
            if (pc.string.startsWith(url, "asset://")) {

            } else {
                // Loading from URL (engine-only)
                pc.net.http.get(url, function(response) {
                    if (callback) {
                        callback(null, response);
                    }
                }, {
                    error: function (status, xhr, e) {
                        if (callback) {
                            callback(pc.string.format("Error loading material: {0} [{1}]", url, status));
                        }
                    }
                });
            }
        },

        open: function (url, data) {
            var material = new pc.PhongMaterial();

            if (!data.parameters) {
                this._createParameters(data);
            }

            material.init(data);
            material._data = data; // temp storage in case we need this during patching (engine-only)
            return material;
        },

        // creates parameters array from data dictionary
        _createParameters: function (data) {
            var parameters = [];

            if (!data.shadingModel) {
                data.shadingModel = data.shader === 'blinn' ? pc.SPECULAR_BLINN : pc.SPECULAR_PHONG;
            }

            var shader = data.shader;

            // remove shader for the following loop
            delete data.shader;

            for (var key in data) {
                if (!data.hasOwnProperty(key)) continue;

                parameters.push({
                    name: key,
                    type: PARAMETER_TYPES[key],
                    data: data[key]
                });
            }

            data.shader = shader;

            data.parameters = parameters;
        },

        patch: function (asset, assets) {
            if (asset.data.shader === undefined) {
                // for engine-only users restore original material data
                asset.data = asset.resource._data;
                delete asset.resource._data;
            }
            this._updatePhongMaterial(asset, asset.data, assets);

            // handle changes to the material
            asset.off('change', this._onAssetChange, this);
            asset.on('change', this._onAssetChange, this);
        },

        _onAssetChange: function (asset, attribute, value) {
            if (attribute === 'data') {
                this._updatePhongMaterial(asset, value, this._assets);
            }
        },

        _updatePhongMaterial: function (asset, data, assets) {
            var material = asset.resource;
            var dir;

            if (asset.file) {
                dir = pc.path.getDirectory(asset.getFileUrl());
            }

            data.name = asset.name;

            if (!data.parameters) {
                this._createParameters(data);
            }

            var pathMapping = (data.mapping_format === "path");
            var id;

            // Replace texture ids with actual textures
            // Should we copy 'data' here instead of updating in place?
            // TODO: This calls material.init() for _every_ texture and cubemap field in the texture with an asset. Combine this into one call to init!
            data.parameters.forEach(function (param, i) {
                if (param.type === 'texture' && param.data && !(param.data instanceof pc.Texture)) {
                    if (pathMapping) {
                        asset = assets.getByUrl(pc.path.join(dir, param.data));
                    } else {
                        id = param.data;
                        asset = assets.get(param.data);
                    }

                    if (asset) {
                        asset.ready(function (asset) {
                            data.parameters[i].data = asset.resource;
                            material.init(data); // Q: better just to update single field?

                            asset.off('change', onTextureAssetChanged, material);
                            asset.on('change', onTextureAssetChanged, material);
                        });
                        assets.load(asset);
                    } else if (id) {
                        assets.once("add:" + id, function (asset) {
                            asset.ready(function (asset) {
                                data.parameters[i].data = asset.resource;
                                material.init(data);

                                asset.off('change', onTextureAssetChanged, material);
                                asset.on('change', onTextureAssetChanged, material);
                            });
                            assets.load(asset);
                        });
                    } else if (pathMapping) {
                        assets.once("add:url:" + pc.path.join(dir, param.data), function (asset) {
                            asset.ready(function (asset) {
                                data.parameters[i].data = asset.resource;
                                material.init(data);

                                asset.off('change', onTextureAssetChanged, material);
                                asset.on('change', onTextureAssetChanged, material);
                            });
                            assets.load(asset);
                        });
                    }
                } else if (param.type === 'cubemap' && param.data && !(param.data instanceof pc.Texture)) {
                    if (pathMapping) {
                        asset = assets.getByUrl(pc.path.join(dir, param.data));
                    } else {
                        id = param.data;
                        asset = assets.get(param.data);
                    }

                    if (asset) {
                        asset.ready(function (asset) {
                            param.data = asset.resource;
                            // if this is a prefiltered map, then extra resources are present
                            if (asset.resources.length > 1) {
                                data.parameters.push({
                                    name: 'prefilteredCubeMap128',
                                    data: asset.resources[1]
                                });
                                data.parameters.push({
                                    name: 'prefilteredCubeMap64',
                                    data: asset.resources[2]
                                });
                                data.parameters.push({
                                    name: 'prefilteredCubeMap32',
                                    data: asset.resources[3]
                                });
                                data.parameters.push({
                                    name: 'prefilteredCubeMap16',
                                    data: asset.resources[4]
                                });
                                data.parameters.push({
                                    name: 'prefilteredCubeMap8',
                                    data: asset.resources[5]
                                });
                                data.parameters.push({
                                    name: 'prefilteredCubeMap4',
                                    data: asset.resources[6]
                                });
                            }
                            material.init(data);

                            asset.off('change', onCubemapAssetChanged, material);
                            asset.on('change', onCubemapAssetChanged, material);
                        });
                        assets.load(asset);
                    } else if (id) {
                        assets.once("add:" + id, function (asset) {
                            asset.ready(function (asset) {
                                // if this is a prefiltered map, then extra resources are present
                                param.data = asset.resource;
                                if (asset.resources.length > 1) {
                                    data.parameters.push({
                                        name: 'prefilteredCubeMap128',
                                        data: asset.resources[1]
                                    });
                                    data.parameters.push({
                                        name: 'prefilteredCubeMap64',
                                        data: asset.resources[2]
                                    });
                                    data.parameters.push({
                                        name: 'prefilteredCubeMap32',
                                        data: asset.resources[3]
                                    });
                                    data.parameters.push({
                                        name: 'prefilteredCubeMap16',
                                        data: asset.resources[4]
                                    });
                                    data.parameters.push({
                                        name: 'prefilteredCubeMap8',
                                        data: asset.resources[5]
                                    });
                                    data.parameters.push({
                                        name: 'prefilteredCubeMap4',
                                        data: asset.resources[6]
                                    });
                                }
                                material.init(data);

                                asset.off('change', onCubemapAssetChanged, material);
                                asset.on('change', onCubemapAssetChanged, material);
                            });
                            assets.load(asset);
                        });
                    } else if (pathMapping) {
                        assets.once("add:url:" + pc.path.join(dir, param.data), function (asset) {
                            asset.ready(function (asset) {
                                data.parameters[i].data = asset.resource;
                                material.init(data);

                                asset.off('change', onCubemapAssetChanged, material);
                                asset.on('change', onCubemapAssetChanged, material);
                            });
                            assets.load(asset);
                        });
                    }
                }
            });

            material.init(data);
        }
    };

    return {
        MaterialHandler: MaterialHandler
    };
}());
