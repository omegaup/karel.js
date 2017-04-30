# -*- coding: utf-8 -*-

"""Librería para parsear entradas y salidas de Karel en XML."""


import xml.etree.ElementTree as ET
import sys


def load():
    """Regresa (input, output, nombre de caso) para la ejecución actual"""
    with open('data.in', 'r') as data_in:
        return (KarelInput(data_in.read()), KarelOutput(sys.stdin.read()),
                sys.argv[1])


class KarelInput(object):
    """Representa un archivo .in."""

    def __init__(self, string):
        self.root = ET.fromstring(string)
        mundo = self.root.find('mundos/mundo').attrib
        self.__w = int(mundo['ancho'])
        self.__h = int(mundo['alto'])
        programa = self.root.find('programas/programa').attrib
        self.__x = int(programa['xKarel'])
        self.__y = int(programa['yKarel'])
        self.__direccion = programa['direccionKarel']
        self.__mochila = programa['mochilaKarel']
        if self.__mochila != 'INFINITO':
            self.__mochila = int(self.mochila)

        self.__despliega = [x.attrib['tipo'].upper() for x in
                            self.root.findall('programas/programa/despliega')]
        self.__despliega_orientacion = 'ORIENTACION' in self.despliega
        self.__despliega_mundo = 'MUNDO' in self.despliega
        self.__despliega_posicion = 'POSICION' in self.despliega
        self.__despliega_instrucciones = 'INSTRUCCIONES' in self.despliega

        lista_zumbadores = [
            {
                'x': int(x.attrib['x']),
                'y': int(x.attrib['y']),
                'zumbadores': x.attrib['zumbadores']
            } for x in self.root.findall('mundos/mundo/monton')]
        self.__zumbadores = {(x['x'], x['y']): x['zumbadores']
                             for x in lista_zumbadores}
        lista_dump = [{k: int(x.attrib[k]) for k in x.attrib} for x in
                      self.root.findall('mundos/mundo/posicionDump')]
        self.__dump = set((x['x'], x['y']) for x in lista_dump)

    @property
    def x(self):
        """La posición x inicial de Karel."""
        return self.__x

    @property
    def y(self):
        """La posición y inicial de Karel."""
        return self.__y

    @property
    def w(self):
        """El ancho del mundo."""
        return self.__w

    @property
    def h(self):
        """"El alto del mundo."""
        return self.__h

    @property
    def direccion(self):
        """La orientación inicial de Karel.

        Puede ser uno de ['NORTE', 'ESTE', 'SUR', 'OESTE'].
        """
        return self.__direccion

    @property
    def mochila(self):
        """El número de zumbadores en la mochila de Karel.

        Puede ser un entero o la cadena 'INFINITO'.
        """
        return self.__mochila

    @property
    def despliega(self):
        """Lista de elementos que se van a guardar en la salida.

        Puede ser uno de ['MUNDO', 'ORIENTACION', 'POSICION'].
        """
        return self.__despliega

    @property
    def despliega_posicion(self):
        """Si se va a desplegar la posición final de Karel en la salida."""
        return self.__despliega_posicion

    @property
    def despliega_orientacion(self):
        """Si se va a desplegar la orientación final de Karel en la salida."""
        return self.__despliega_orientacion

    @property
    def despliega_mundo(self):
        """Si se van a desplegar los zumbadores elegidos en la salida."""
        return self.__despliega_mundo

    @property
    def despliega_instrucciones(self):
        """Si se va a desplegar el número de instrucciones en la salida."""
        return self.__despliega_instrucciones

    @property
    def lista_zumbadores(self):
        """Un diccionario con los zumbadores.

        Cada llave (x, y) tiene como valor el número de zumbadores en esa
        casilla.
        """
        return self.__zumbadores

    def zumbadores(self, x, y):
        """Regresa el número de zumbadores para la casilla en (x, y).

        Si hay una cantidad infinita de zumbadores, regresa la cadena
        'INFINITO'.
        """
        if (x, y) not in self.__zumbadores:
            return 0
        z = self.__zumbadores[(x, y)]
        if z == 'INFINITO':
            return z
        return int(z)

    @property
    def lista_dump(self):
        """El conjunto de casillas marcadas para generar una salida."""
        return self.__dump

    def dump(self, x, y):
        """Regresa True si la casilla está marcada para generar una salida."""
        return (x, y) in self.__dump

    def __repr__(self):
        """Imprime una versión bonita del objeto."""
        return '<libkarel.KarelInput %s>' % ', '.join('%s=%r' % x for x in {
            'x': self.x,
            'y': self.y,
            'mochila': self.mochila,
            'direccion': self.direccion,
            'despliega': self.despliega,
        }.iteritems())


class KarelOutput(object):
    """Representa un archivo .out."""

    def __init__(self, string):
        self.root = ET.fromstring(string)
        self.__zumbadores = {}
        for linea in self.root.findall('mundos/mundo/linea'):
            y = int(linea.attrib['fila'])
            x = 0
            for token in linea.text.strip().split():
                if token[0] == '(':
                    x = int(token[1:-1])
                else:
                    self.__zumbadores[(x, y)] = token
                    x += 1

        programa = self.root.find('programas/programa')
        self.__resultado = programa.attrib['resultadoEjecucion']
        karel = self.root.find('programas/programa/karel')
        self.__x = None
        self.__y = None
        self.__direccion = None
        if karel is not None:
            if 'x' in karel.attrib:
                self.__x = int(karel.attrib['x'])
                self.__y = int(karel.attrib['y'])
            if 'direccion' in karel.attrib:
                self.__direccion = karel.attrib['direccion']

        self.__instrucciones = {
            'avanza': None,
            'gira_izquierda': None,
            'coge_zumbador': None,
            'deja_zumbador': None,
        }
        instrucciones = self.root.find('programas/programa/instrucciones')
        if instrucciones is not None:
            for k in self.__instrucciones:
                if k in instrucciones.attrib:
                    self.__instrucciones[k] = int(instrucciones.attrib[k])

    @property
    def x(self):
        """La posición x final de Karel. None si no se hizo dump posición."""
        return self.__x

    @property
    def y(self):
        """La posición y final de Karel. None si no se hizo dump posición."""
        return self.__y

    @property
    def direccion(self):
        """La orientación final de Karel.

        Puede ser uno de ['NORTE', 'ESTE', 'SUR', 'OESTE'], o None si no se
        hizo dump orientación."""
        return self.__direccion

    @property
    def resultado(self):
        """Una cadena con el resultado de la ejecución.

        'FIN PROGRAMA' significa ejecución exitosa.
        """
        return self.__resultado

    @property
    def error(self):
        """True si no fue una ejecución exitosa."""
        return self.resultado != 'FIN PROGRAMA'

    @property
    def lista_zumbadores(self):
        """Un diccionario con los zumbadores.

        Cada llave (x, y) tiene como valor el número de zumbadores en esa
        casilla al final de la ejecución.
        """
        return self.__zumbadores

    @property
    def instrucciones(self):
        """Un diccionario con el número de instrucciones que karel ejecutó"""
        return self.__instrucciones

    def zumbadores(self, x, y):
        """Regresa el número de zumbadores para la casilla en (x, y)

        Si hay una cantidad infinita de zumbadores, regresa la cadena
        'INFINITO'.
        """
        if (x, y) not in self.__zumbadores:
            return 0
        z = self.__zumbadores[(x, y)]
        if z == 'INFINITO':
            return z
        return int(z)

    def __repr__(self):
        """Imprime una versión bonita del objeto"""
        return '<libkarel.KarelOutput %s>' % ', '.join('%s=%r' % x for x in {
            'x': self.x,
            'y': self.y,
            'direccion': self.direccion,
            'resultado': self.resultado,
            'error': self.error,
        }.iteritems())

# vim: tabstop=4 expandtab shiftwidth=4 softtabstop=4
