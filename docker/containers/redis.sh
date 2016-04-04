#!/usr/bin/env bash

#docker run --name=redis -p 6379:6379 -d docker-artifacts.ua-ecm.com/redis:latest

REDIS=$(docker run -d -p 6379:6379 --name redis docker-artifacts.ua-ecm.com/redis:latest | tail -n 1)
