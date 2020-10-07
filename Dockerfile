FROM ubuntu:18.04

RUN apt-get update -y
RUN apt-get install -y fontconfig

ADD web/ /web
ADD run.sh /run.sh
ADD MathJax/ /MathJax

ADD phantomjs /phantomjs  

EXPOSE 16000

CMD ["sh", "/run.sh"]
