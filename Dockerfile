FROM ubuntu:18.04


RUN apt-get update -y
RUN apt-get install -y fontconfig  

ADD web/ /web
ADD run.sh /run.sh

#ADD phantomjs /usr/bin/phantomjs  
RUN wget https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-2.1.1-linux-x86_64.tar.bz2
RUN tar -xjf phantomjs-2.1.1-linux-x86_64.tar.bz2
RUN mv phantomjs-2.1.1-linux-x86_64/bin/phantomjs /usr/bin/
RUN rm -rf phantomjs-2.1.1-linux*

EXPOSE 16000

CMD ["sh", "/run.sh"]
