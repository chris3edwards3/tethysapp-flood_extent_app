#!/bin/sh
echo "Downloading thredds data files...."

if [ "$1" == "" ]; then
    echo "Invalid Source Data Directory"
    exit(1)
else
    echo $1
fi