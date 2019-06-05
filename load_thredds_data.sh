#!/bin/sh

# Assuming this file is always run inside the docker container 
# or on a system that contains curl


server_url="https://tethys.byu.edu/thredds/fileServer/testAll/floodextent/"

declare -a links=("dominicanrepublicratingcurve.csv" 
	"dominicanrepublichandproj.nc"
	"dominicanrepublicdrainage.json"
	"dominicanrepubliccatchproj.nc"
	"probscale.nc"
	"floodedscale.nc"
    )

echo "Downloading thredds data files...."

if [ "$1" == "" ]; then
    echo "Invalid Source Data Directory"
fi

mkdir -p $1/thredds/public

chmod 0755 -R $1/thredds/public

for i in "${links[@]}"
do
   	curl "$server_url$i" --create-dirs -o "$1/thredds/public/flood_extent_data/$i" 
done

echo "......Download Done"