FROM ubuntu:18.04


RUN apt-get update -y
RUN apt-get install -y fontconfig  

ADD data/web/ /web
ADD data/run.sh /run.sh
ADD data/phantomjs /usr/bin/phantomjs  

EXPOSE 16000

CMD ["sh", "/run.sh"]