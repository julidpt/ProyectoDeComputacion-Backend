from bs4 import BeautifulSoup
import pandas as pd
import requests
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import time
import json

text = input("Introduce un lugar: ")
num_news = int(input("Introduce el numero de noticias: "))
place = text.replace(" ", "-")
r = requests.get(f'https://www.20minutos.es/busqueda/?q=' + place)
contenido = r.text
soup = BeautifulSoup(contenido, 'html.parser')

print("Estas son las noticias relacionadas con: ", place)
noticias = []
i = 1
while len(noticias) < num_news:
    try:
        url = 'https://www.20minutos.es/busqueda/'+ str(i) + '/?q=' + place
        i = i+1
        r = requests.get(url)
        soup = BeautifulSoup(r.text, 'html.parser')
        articles = soup.find_all('article')
        for article in articles:
            titleContainer = article.find('div', { 'class': 'media-content' })
            hyperLink = titleContainer.find('a')
            articleLink = hyperLink['href']
            articleTitle = hyperLink.text
            titleClean = articleTitle.strip()
            print(titleClean)
            articlePage = requests.get(articleLink)
            parsedPage = BeautifulSoup(articlePage.text, 'html.parser')
            dateTime = parsedPage.find('span', { 'class': 'article-date' })
            if dateTime is None:
                continue

            articleSection = parsedPage.find('article', { 'class': 'article-body' })
            if articleSection is None:
                continue

            articleContent = articleSection.find('div', { 'class': 'article-text' }).text
            if articleContent is None:
                continue

            articleTagContainer = parsedPage.find(
                'div', {'class': 'module module-related'}
            )

            if articleTagContainer is None:
                continue

            tags = []
            for tagItem in articleTagContainer.find_all('li', {'class': 'tag'}):
                tag = tagItem.find('a').text.strip()
                tags.append(tag)


            doc = {}
            doc['title'] = titleClean
            doc['Lugar'] = text
            doc['tags'] = tags
            doc['noticia'] = articleContent
            doc['Analisis del sentimiento'] = SentimentIntensityAnalyzer().polarity_scores(doc['noticia'])
            print(doc['noticia'])
            doc['fecha'] = dateTime.text
            noticias.append(doc)
            print(doc)
            if len(noticias) == num_news:
                break
    except:
        break
print(len(noticias))
with open('./resultado/20minutos.json', 'w',  encoding='utf-8') as f:
    json.dump(noticias, f, ensure_ascii=False, indent=4)